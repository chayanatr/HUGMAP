-- ตารางเดินทางสำหรับลูกค้า/ทีมรถตู้: ข้อความประกอบทริป/วัน/จุดแวะ (หัวเรื่องย่อย ชื่อวัน หมายเหตุ พักทานอาหาร ฯลฯ)
alter table trips
  add column subtitle text check (char_length(subtitle) <= 160),         -- เช่น "รถตู้ส่วนตัวพร้อมคนขับ 2 วัน 1 คืน"
  add column lodging_note text check (char_length(lodging_note) <= 160), -- เช่น "พักเมืองเฟือง 1 คืน"
  add column footer_note text check (char_length(footer_note) <= 1500);  -- หมายเหตุท้ายตาราง

alter table trip_days
  add column title text check (char_length(title) <= 120),               -- เช่น "วังเวียง–เมืองเฟือง"
  add column start_min int check (start_min between 0 and 1439),         -- เวลาออกเดินทางของวันนี้ (ว่าง = ใช้เวลาเริ่มของทริป)
  add column start_note text check (char_length(start_note) <= 600),     -- หมายเหตุที่จุดรับ
  add column end_note text check (char_length(end_note) <= 600);         -- หมายเหตุที่จุดส่ง/ที่พัก

alter table trip_stops
  add column note text check (char_length(note) <= 600),                 -- คำอธิบายจุดนี้ (ว่าง = ใช้คำอธิบายของสถานที่)
  add column stay_min int check (stay_min between 5 and 720),            -- เวลาอยู่ที่จุดนี้ (ว่าง = เวลาแนะนำของสถานที่)
  add column break_label text check (char_length(break_label) <= 60),    -- พักหลังจุดนี้ เช่น "รับประทานอาหารกลางวัน"
  add column break_min int check (break_min between 5 and 480);

-- เรียงลำดับทั้งวัน: คงรายละเอียดของแต่ละจุด (ผูกตาม place_id) ไว้ แล้ว insert ใหม่ตามลำดับ — ล้าง cache เส้นทางของวันนั้น
create or replace function reorder_day(p_day uuid, p_place_ids uuid[])
returns void language plpgsql
set search_path = public, pg_temp
as $$
begin
  with old as (
    select place_id, note, stay_min, break_label, break_min from trip_stops where day_id = p_day
  ), del as (
    delete from trip_stops where day_id = p_day returning 1
  )
  insert into trip_stops (day_id, place_id, position, note, stay_min, break_label, break_min)
  select p_day, t.pid, t.ord - 1, o.note, o.stay_min, o.break_label, o.break_min
  from unnest(p_place_ids) with ordinality as t(pid, ord)
  left join old o on o.place_id = t.pid;
  update trip_days set route_geom = null where id = p_day;
end $$;

-- ลิงก์ลูกค้า: ส่งข้อความประกอบเพิ่ม (ทริป/วัน/จุดแวะ)
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
    select coalesce(jsonb_agg(jsonb_build_object(
             'place', place_json(p), 'leg_km', s.leg_km, 'leg_min', s.leg_min,
             'note', s.note, 'stay_min', s.stay_min, 'break_label', s.break_label, 'break_min', s.break_min
           ) order by s.position), '[]'::jsonb)
      into stops_json
      from trip_stops s join places p on p.id = s.place_id where s.day_id = d.id;

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
      'id', d.id, 'day_no', d.day_no, 'title', d.title, 'start_min', d.start_min,
      'start_note', d.start_note, 'end_note', d.end_note,
      'route', case when d.route_geom is null then null else st_asgeojson(d.route_geom::geometry)::jsonb end,
      'start', case when d.start_lat is null then null else jsonb_build_object('name', d.start_name, 'lat', d.start_lat, 'lng', d.start_lng) end,
      'end', case when d.end_lat is null then null else jsonb_build_object('name', d.end_name, 'lat', d.end_lat, 'lng', d.end_lng) end,
      'start_leg_km', d.start_leg_km, 'start_leg_min', d.start_leg_min,
      'stops', stops_json, 'nearby', nearby_json
    ));
  end loop;

  return jsonb_build_object(
    'trip', jsonb_build_object('id', t.id, 'code', t.code, 'name', t.name, 'client_name', t.client_name,
                               'pax', t.pax, 'start_date', t.start_date, 'day_start_min', t.day_start_min,
                               'subtitle', t.subtitle, 'lodging_note', t.lodging_note, 'footer_note', t.footer_note),
    'days', days_json
  );
end $$;

revoke all on function shared_trip(text, double precision) from public;
grant execute on function shared_trip(text, double precision) to anon, authenticated;
