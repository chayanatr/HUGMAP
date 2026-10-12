-- HUGMAP schema (Supabase / Postgres + PostGIS)
create extension if not exists postgis;

create type place_category as enum ('temple','cafe','food','stay','nature','market','view','museum','gift');
create type city_key as enum ('lp','vte','vv','pakse','other');

create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category place_category not null,
  city city_key not null default 'other',
  location geography(Point, 4326) not null,
  lat double precision generated always as (st_y(location::geometry)) stored,
  lng double precision generated always as (st_x(location::geometry)) stored,
  open_hours text,
  fee text,
  duration_min int not null default 30 check (duration_min > 0),
  description text,
  photos text[] not null default '{}',
  created_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint in_laos check (st_y(location::geometry) between 13.9 and 22.5 and st_x(location::geometry) between 100.0 and 107.7)
);
create index places_location_gix on places using gist (location);
create index places_city_cat_idx on places (city, category);

create table trips (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  client_name text not null,
  pax int not null default 1,
  start_date date not null,
  day_start_min int not null default 540,
  share_token text unique,
  created_by uuid references auth.users,
  created_at timestamptz not null default now()
);

create table trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips on delete cascade,
  day_no int not null,
  route_geom geography(LineString, 4326),   -- cache จาก OSRM
  unique (trip_id, day_no)
);

create table trip_stops (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references trip_days on delete cascade,
  place_id uuid not null references places on delete cascade,
  position int not null,
  leg_km numeric, leg_min int,              -- cache จาก OSRM ไปจุดถัดไป
  unique (day_id, position) deferrable initially deferred
);

-- เรียงลำดับทั้งวันในครั้งเดียว
create or replace function reorder_day(p_day uuid, p_place_ids uuid[])
returns void language plpgsql as $$
begin
  delete from trip_stops where day_id = p_day;
  insert into trip_stops (day_id, place_id, position)
  select p_day, pid, ord - 1 from unnest(p_place_ids) with ordinality as t(pid, ord);
end $$;

-- สถานที่ใกล้เส้นทาง: geojson LineString + รัศมี (เมตร)
create or replace function places_near_route(route_geojson jsonb, radius_m double precision, exclude_ids uuid[] default '{}')
returns table (id uuid, distance_m double precision)
language sql stable as $$
  with r as (select st_setsrid(st_geomfromgeojson(route_geojson::text), 4326)::geography as g)
  select p.id, st_distance(p.location, r.g) as distance_m
  from places p, r
  where st_dwithin(p.location, r.g, radius_m) and not (p.id = any(exclude_ids))
  order by distance_m
  limit 30;
$$;

-- RLS: ผู้ใช้ที่ล็อกอินอ่านได้ทั้งหมด; แก้ไข places เฉพาะ admin (custom claim role)
alter table places enable row level security;
alter table trips enable row level security;
alter table trip_days enable row level security;
alter table trip_stops enable row level security;
create policy "read places" on places for select to authenticated using (true);
create policy "admin write places" on places for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "staff trips" on trips for all to authenticated using (true) with check (true);
create policy "staff days" on trip_days for all to authenticated using (true) with check (true);
create policy "staff stops" on trip_stops for all to authenticated using (true) with check (true);
-- หน้า /share/[token] ให้อ่านผ่าน server route ด้วย service role โดยกรองตาม share_token
