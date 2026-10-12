-- Storage bucket สำหรับรูปสถานที่ (อ่านได้สาธารณะ, เขียนเฉพาะ admin)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-photos', 'place-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "place photos read" on storage.objects for select
  using (bucket_id = 'place-photos');
create policy "place photos admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'place-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "place photos admin update" on storage.objects for update to authenticated
  using (bucket_id = 'place-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "place photos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'place-photos' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
