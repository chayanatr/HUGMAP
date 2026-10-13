-- เฟส 3: จัดเส้นทาง
-- 1) unique(trip_id, day_no) ต้อง deferrable เพื่อเลื่อนเลขวันตอนลบวันกลางทริป
alter table trip_days drop constraint trip_days_trip_id_day_no_key;
alter table trip_days add constraint trip_days_trip_id_day_no_key unique (trip_id, day_no) deferrable initially deferred;

-- 2) เรียงลำดับทั้งวันในครั้งเดียว — ล้าง cache เส้นทางของวันนั้นด้วย (leg_km/leg_min ถูกลบพร้อม stops เดิม)
create or replace function reorder_day(p_day uuid, p_place_ids uuid[])
returns void language plpgsql as $$
begin
  delete from trip_stops where day_id = p_day;
  insert into trip_stops (day_id, place_id, position)
  select p_day, pid, ord - 1 from unnest(p_place_ids) with ordinality as t(pid, ord);
  update trip_days set route_geom = null where id = p_day;
end $$;

-- 3) บันทึก cache เส้นทางจริง (geojson LineString) + ระยะ/เวลาของแต่ละช่วง
--    ทำงานเฉพาะเมื่อลำดับจุดยังตรงกับที่คำนวณ (กันผลเก่าทับลำดับใหม่)
--    p_legs = [{"km": 1.2, "min": 4}, ...] เรียงตามช่วงจากจุดแรก
create or replace function save_day_route(p_day uuid, p_place_ids uuid[], p_geojson jsonb, p_legs jsonb)
returns boolean language plpgsql as $$
declare current_ids uuid[];
begin
  select array_agg(place_id order by position) into current_ids from trip_stops where day_id = p_day;
  if current_ids is distinct from p_place_ids then return false; end if;
  update trip_days
    set route_geom = st_setsrid(st_geomfromgeojson(p_geojson::text), 4326)::geography
    where id = p_day;
  update trip_stops s
    set leg_km = (t.l ->> 'km')::numeric, leg_min = (t.l ->> 'min')::int
    from jsonb_array_elements(p_legs) with ordinality as t(l, ord)
    where s.day_id = p_day and s.position = t.ord - 1;
  return true;
end $$;

-- 4) อ่าน geometry ที่ cache ไว้เป็น geojson (PostgREST คืน geography เป็น hex ไม่ใช่ geojson)
create or replace function trip_day_routes(p_trip uuid)
returns table (day_id uuid, geojson jsonb)
language sql stable as $$
  select d.id, st_asgeojson(d.route_geom::geometry)::jsonb
  from trip_days d
  where d.trip_id = p_trip and d.route_geom is not null;
$$;

-- 5) ลบวัน แล้วเลื่อนเลขวันถัดไปขึ้นมา
create or replace function delete_day(p_day uuid)
returns void language plpgsql as $$
declare t uuid; n int;
begin
  select trip_id, day_no into t, n from trip_days where id = p_day;
  delete from trip_days where id = p_day;
  update trip_days set day_no = day_no - 1 where trip_id = t and day_no > n;
end $$;
