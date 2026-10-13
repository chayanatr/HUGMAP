-- ใช้เฉพาะช่วงทดสอบ! เปิดให้ anon key อ่าน/เขียน places และตารางทริปได้ (ห้าม apply บน production)
create policy "dev anon read places" on places for select to anon using (true);
create policy "dev anon write places" on places for insert to anon with check (true);
create policy "dev anon update places" on places for update to anon using (true) with check (true);
create policy "dev anon delete places" on places for delete to anon using (true);
create policy "dev anon upload place photos" on storage.objects for insert to anon with check (bucket_id = 'place-photos');

create policy "dev anon all trips" on trips for all to anon using (true) with check (true);
create policy "dev anon all trip_days" on trip_days for all to anon using (true) with check (true);
create policy "dev anon all trip_stops" on trip_stops for all to anon using (true) with check (true);
