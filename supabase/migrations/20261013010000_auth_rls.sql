-- เฟส 5: สิทธิ์ผู้ใช้ (Supabase Auth) + RLS เข้มขึ้น + ฟังก์ชันอ่านลิงก์ลูกค้าด้วย token
-- role เก็บใน app_metadata.role ('admin' | 'staff') — ผู้ใช้แก้เองไม่ได้ (ตั้งค่าโดย admin ผ่าน dashboard/SQL เท่านั้น)

create or replace function app_role()
returns text language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

alter table places alter column created_by set default auth.uid();
alter table trips alter column created_by set default auth.uid();

-- places: admin และ staff อ่านได้, เฉพาะ admin เพิ่ม/แก้/ลบ
drop policy if exists "read places" on places;
drop policy if exists "admin write places" on places;
create policy "staff read places" on places for select to authenticated
  using (app_role() in ('admin', 'staff'));
create policy "admin insert places" on places for insert to authenticated
  with check (app_role() = 'admin');
create policy "admin update places" on places for update to authenticated
  using (app_role() = 'admin') with check (app_role() = 'admin');
create policy "admin delete places" on places for delete to authenticated
  using (app_role() = 'admin');

-- ทริป: admin และ staff จัดการได้ (ผู้ที่ล็อกอินแต่ไม่มี role เข้าไม่ได้)
drop policy if exists "staff trips" on trips;
drop policy if exists "staff days" on trip_days;
drop policy if exists "staff stops" on trip_stops;
create policy "staff manage trips" on trips for all to authenticated
  using (app_role() in ('admin', 'staff')) with check (app_role() in ('admin', 'staff'));
create policy "staff manage trip_days" on trip_days for all to authenticated
  using (app_role() in ('admin', 'staff')) with check (app_role() in ('admin', 'staff'));
create policy "staff manage trip_stops" on trip_stops for all to authenticated
  using (app_role() in ('admin', 'staff')) with check (app_role() in ('admin', 'staff'));

-- ลิงก์ลูกค้า: คนที่ไม่ได้ล็อกอิน (anon) อ่านได้เฉพาะทริปที่ตรงกับ share_token ผ่านฟังก์ชันนี้เท่านั้น
-- security definer = ข้าม RLS ภายในฟังก์ชัน แต่คืนเฉพาะข้อมูลของทริปนั้น + สถานที่ใกล้เส้นทาง (ไม่คืนรายการสถานที่ทั้งหมด)
create or replace function place_json(pl places)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', pl.id, 'name', pl.name, 'category', pl.category, 'city', pl.city, 'lat', pl.lat, 'lng', pl.lng,
    'open_hours', pl.open_hours, 'fee', pl.fee, 'duration_min', pl.duration_min,
    'description', pl.description, 'photos', pl.photos
  )
$$;

create or replace function shared_trip(p_token text, p_radius_m double precision default 1000)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions, pg_temp
as $$
declare
  t trips%rowtype;
  d record;
  geo geography;
  in_trip uuid[];
  days_json jsonb := '[]'::jsonb;
  stops_json jsonb;
  nearby_json jsonb;
  stop_count int;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then return null; end if;
  select * into t from trips where share_token = p_token;
  if not found then return null; end if;

  select coalesce(array_agg(s.place_id), '{}') into in_trip
    from trip_stops s join trip_days dd on dd.id = s.day_id where dd.trip_id = t.id;

  for d in select * from trip_days where trip_id = t.id order by day_no loop
    select coalesce(jsonb_agg(jsonb_build_object('place', place_json(p), 'leg_km', s.leg_km, 'leg_min', s.leg_min) order by s.position), '[]'::jsonb),
           count(*)
      into stops_json, stop_count
      from trip_stops s join places p on p.id = s.place_id where s.day_id = d.id;

    -- เส้นทางจริงที่ cache ไว้ ถ้าไม่มีใช้เส้นตรงเชื่อมจุดแวะ (หรือจุดเดียว)
    geo := d.route_geom;
    if geo is null and stop_count > 1 then
      select st_makeline(array_agg(p.location::geometry order by s.position))::geography into geo
        from trip_stops s join places p on p.id = s.place_id where s.day_id = d.id;
    elsif geo is null and stop_count = 1 then
      select p.location into geo from trip_stops s join places p on p.id = s.place_id where s.day_id = d.id;
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
