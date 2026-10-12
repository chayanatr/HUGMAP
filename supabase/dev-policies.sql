-- ใช้เฉพาะช่วงทดสอบ! เปิดให้ anon key อ่าน/เขียน places ได้ (ลบออกก่อนขึ้น production)
create policy "dev anon read places" on places for select to anon using (true);
create policy "dev anon write places" on places for insert to anon with check (true);
create policy "dev anon update places" on places for update to anon using (true) with check (true);
create policy "dev anon delete places" on places for delete to anon using (true);
