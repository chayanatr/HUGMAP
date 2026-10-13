-- ล็อก search_path ของฟังก์ชันของแอป (Supabase security advisor: function_search_path_mutable)
-- postgis ติดตั้งใน schema public จึงต้องมี public (และ extensions เผื่อย้ายภายหลัง)
alter function app_role() set search_path = public, pg_temp;
alter function place_json(places) set search_path = public, extensions, pg_temp;
alter function places_near_route(jsonb, double precision, uuid[]) set search_path = public, extensions, pg_temp;
alter function reorder_day(uuid, uuid[]) set search_path = public, pg_temp;
alter function save_day_route(uuid, uuid[], jsonb, jsonb) set search_path = public, extensions, pg_temp;
alter function trip_day_routes(uuid) set search_path = public, extensions, pg_temp;
alter function delete_day(uuid) set search_path = public, pg_temp;
