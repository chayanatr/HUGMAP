-- จุดรับ/ส่งลูกค้ารายวัน: แต่ละวันมีจุดเริ่มต้น (รับ) และปลายทาง (ส่ง) ได้ — เป็นชื่อ + พิกัดอิสระ ไม่ต้องอยู่ในตาราง places
-- (เช่น สนามบิน, โรงแรมที่ไม่ได้บันทึก, จุดนัดพบ)
alter table trip_days
  add column start_name text,
  add column start_lat double precision,
  add column start_lng double precision,
  add column end_name text,
  add column end_lat double precision,
  add column end_lng double precision,
  add column start_leg_km numeric,   -- cache: จุดรับ → จุดแวะแรก (ช่วงอื่นอยู่ที่ trip_stops.leg_*; จุดแวะสุดท้าย → จุดส่ง เก็บที่ stop สุดท้าย)
  add column start_leg_min int,
  add constraint trip_days_start_all_or_none
    check ((start_name is null) = (start_lat is null) and (start_lat is null) = (start_lng is null)),
  add constraint trip_days_end_all_or_none
    check ((end_name is null) = (end_lat is null) and (end_lat is null) = (end_lng is null)),
  add constraint trip_days_endpoint_range
    check ((start_lat is null or (start_lat between -90 and 90 and start_lng between -180 and 180))
       and (end_lat is null or (end_lat between -90 and 90 and end_lng between -180 and 180)));

-- save_day_route เพิ่มช่วงจุดรับ → จุดแวะแรก (p_start_leg = {"km":..,"min":..} หรือ null เมื่อไม่มีจุดรับ)
drop function save_day_route(uuid, uuid[], jsonb, jsonb);
create function save_day_route(p_day uuid, p_place_ids uuid[], p_geojson jsonb, p_legs jsonb, p_start_leg jsonb default null)
returns boolean language plpgsql
set search_path = public, extensions, pg_temp
as $$
declare current_ids uuid[];
begin
  select array_agg(place_id order by position) into current_ids from trip_stops where day_id = p_day;
  if current_ids is distinct from p_place_ids then return false; end if;
  update trip_days
    set route_geom = st_setsrid(st_geomfromgeojson(p_geojson::text), 4326)::geography,
        start_leg_km = (p_start_leg ->> 'km')::numeric,
        start_leg_min = (p_start_leg ->> 'min')::int
    where id = p_day;
  update trip_stops s
    set leg_km = (t.l ->> 'km')::numeric, leg_min = (t.l ->> 'min')::int
    from jsonb_array_elements(p_legs) with ordinality as t(l, ord)
    where s.day_id = p_day and s.position = t.ord - 1;
  return true;
end $$;

-- ลิงก์ลูกค้า: คืนจุดรับ/ส่งของแต่ละวัน + ช่วงจุดรับ→จุดแวะแรก และเส้นตรงสำรอง (เมื่อยังไม่มี cache เส้นทางจริง) รวมจุดรับ/ส่งด้วย
create or replace function shared_trip(p_token text, p_radius_m double precision default 1000)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions, pg_temp
as $$
declare
  t trips%rowtype;
  d record;
  geo geography;
  pts geometry[];
  in_trip uuid[];
  days_json jsonb := '[]'::jsonb;
  stops_json jsonb;
  nearby_json jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then return null; end if;
  select * into t from trips where share_token = p_token;
  if not found then return null; end if;

  select coalesce(array_agg(s.place_id), '{}') into in_trip
    from trip_stops s join trip_days dd on dd.id = s.day_id where dd.trip_id = t.id;

  for d in select * from trip_days where trip_id = t.id order by day_no loop
    select coalesce(jsonb_agg(jsonb_build_object('place', place_json(p), 'leg_km', s.leg_km, 'leg_min', s.leg_min) order by s.position), '[]'::jsonb)
      into stops_json
      from trip_stops s join places p on p.id = s.place_id where s.day_id = d.id;

    -- เส้นทางจริงที่ cache ไว้ ถ้าไม่มีใช้เส้นตรงเชื่อมจุดรับ → จุดแวะ → จุดส่ง (หรือจุดเดียว)
    geo := d.route_geom;
    if geo is null then
      select array_agg(p.location::geometry order by s.position) into pts
        from trip_stops s join places p on p.id = s.place_id where s.day_id = d.id;
      if d.start_lat is not null then
        pts := array[st_setsrid(st_makepoint(d.start_lng, d.start_lat), 4326)] || coalesce(pts, '{}');
      end if;
      if d.end_lat is not null then
        pts := coalesce(pts, '{}') || array[st_setsrid(st_makepoint(d.end_lng, d.end_lat), 4326)];
      end if;
      if coalesce(array_length(pts, 1), 0) > 1 then
        geo := st_makeline(pts)::geography;
      elsif coalesce(array_length(pts, 1), 0) = 1 then
        geo := pts[1]::geography;
      end if;
    end if;

    nearby_json := '[]'::jsonb;
    if geo is not null then
      select coalesce(jsonb_agg(jsonb_build_object('place', x.pj, 'distance_m', x.dist) order by x.dist), '[]'::jsonb)
        into nearby_json
        from (
          select place_json(p2) as pj, st_distance(p2.location, geo) as dist
          from places p2
          where st_dwithin(p2.location, geo, p_radius_m) and not (p2.id = any(in_trip))
          order by dist limit 30
        ) x;
    end if;

    days_json := days_json || jsonb_build_array(jsonb_build_object(
      'id', d.id, 'day_no', d.day_no,
      'route', case when d.route_geom is null then null else st_asgeojson(d.route_geom::geometry)::jsonb end,
      'start', case when d.start_lat is null then null else jsonb_build_object('name', d.start_name, 'lat', d.start_lat, 'lng', d.start_lng) end,
      'end', case when d.end_lat is null then null else jsonb_build_object('name', d.end_name, 'lat', d.end_lat, 'lng', d.end_lng) end,
      'start_leg_km', d.start_leg_km, 'start_leg_min', d.start_leg_min,
      'stops', stops_json, 'nearby', nearby_json
    ));
  end loop;

  return jsonb_build_object(
    'trip', jsonb_build_object('id', t.id, 'code', t.code, 'name', t.name, 'client_name', t.client_name,
                               'pax', t.pax, 'start_date', t.start_date, 'day_start_min', t.day_start_min),
    'days', days_json
  );
end $$;

revoke all on function shared_trip(text, double precision) from public;
grant execute on function shared_trip(text, double precision) to anon, authenticated;
