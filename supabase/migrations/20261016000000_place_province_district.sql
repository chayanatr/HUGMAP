-- แขวง (province) ครบ 18 แห่ง + เมือง (district) ของสถานที่ แทน city enum 5 ค่า
alter table places add column province text, add column district text;

-- เติมจากค่า city เดิม
update places set
  province = case city::text when 'lp' then 'luang_prabang' when 'vte' then 'vientiane_capital' when 'vv' then 'vientiane' when 'pakse' then 'champasak' end,
  district = case city::text when 'lp' then 'หลวงพระบาง' when 'vte' then 'เวียงจันทน์' when 'vv' then 'วังเวียง' when 'pakse' then 'ปากเซ' end;

-- ที่เหลือ (city = other) เดาจากเมืองหลักที่ใกล้ที่สุด — ประมาณการ ผู้ดูแลตรวจ/แก้ในฟอร์มสถานที่ได้
with centers (key, lat, lng) as (values
  ('vientiane_capital', 17.9757, 102.6331), ('vientiane', 18.5, 102.43), ('phongsaly', 21.6833, 102.1),
  ('luang_namtha', 20.95, 101.4), ('bokeo', 20.2667, 100.4167), ('oudomxay', 20.6833, 101.9833),
  ('luang_prabang', 19.8856, 102.1347), ('xayaboury', 19.25, 101.7333), ('houaphanh', 20.4167, 104.05),
  ('xiengkhouang', 19.4547, 103.2), ('xaisomboun', 18.9, 103.0), ('bolikhamsai', 18.3833, 103.65),
  ('khammouane', 17.4, 104.8), ('savannakhet', 16.55, 104.75), ('salavan', 15.7167, 106.4167),
  ('sekong', 15.35, 106.7167), ('champasak', 15.1202, 105.799), ('attapeu', 14.8, 106.8333)
)
update places p set province = (
  select c.key from centers c
  order by st_distance(p.location, st_setsrid(st_makepoint(c.lng, c.lat), 4326)::geography) limit 1
) where p.province is null;

alter table places alter column province set not null;
alter table places add constraint places_province_check check (province in (
  'vientiane_capital', 'vientiane', 'phongsaly', 'luang_namtha', 'bokeo', 'oudomxay', 'luang_prabang', 'xayaboury', 'houaphanh',
  'xiengkhouang', 'xaisomboun', 'bolikhamsai', 'khammouane', 'savannakhet', 'salavan', 'sekong', 'champasak', 'attapeu'
));

drop index places_city_cat_idx;
alter table places drop column city;
drop type city_key;
create index places_province_cat_idx on places (province, category);

-- ลิงก์ลูกค้า (shared_trip) ใช้ place_json — ส่ง province/district แทน city (คง search_path ที่ล็อกไว้)
create or replace function place_json(pl places)
returns jsonb language sql stable
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'id', pl.id, 'name', pl.name, 'category', pl.category, 'province', pl.province, 'district', pl.district,
    'lat', pl.lat, 'lng', pl.lng,
    'open_hours', pl.open_hours, 'fee', pl.fee, 'duration_min', pl.duration_min,
    'description', pl.description, 'photos', pl.photos
  )
$$;
