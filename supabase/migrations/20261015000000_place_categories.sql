-- หมวดสถานที่ที่ผู้ดูแลเพิ่ม/แก้ไขเองได้: เปลี่ยน enum place_category เป็นตาราง place_categories + places.category (text) อ้างอิงด้วย FK
create table place_categories (
  key text primary key check (key ~ '^[a-z0-9_]{2,32}$'),
  label text not null check (char_length(btrim(label)) between 1 and 40),
  icon text not null default 'place' check (icon ~ '^[a-z0-9_]{1,48}$'),   -- ชื่อไอคอน Material Symbols Rounded
  hue int not null check (hue between 0 and 360),                           -- ใช้สร้างสี oklch(0.6 0.12 hue)
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- หมวดเดิม 9 หมวด (ค่าเดียวกับ lib/categories.ts)
insert into place_categories (key, label, icon, hue, sort) values
  ('temple', 'วัด', 'temple_buddhist', 75, 1),
  ('cafe', 'คาเฟ่', 'local_cafe', 45, 2),
  ('food', 'ร้านอาหาร', 'restaurant', 25, 3),
  ('stay', 'ที่พัก', 'hotel', 320, 4),
  ('nature', 'น้ำตก/ธรรมชาติ', 'water', 155, 5),
  ('market', 'ตลาด', 'storefront', 355, 6),
  ('view', 'จุดชมวิว', 'landscape', 215, 7),
  ('museum', 'พิพิธภัณฑ์', 'museum', 260, 8),
  ('gift', 'ร้านของฝาก', 'redeem', 110, 9);

alter table places alter column category type text using category::text;
alter table places
  add constraint places_category_fkey foreign key (category) references place_categories (key) on update cascade on delete restrict;
drop type place_category;

-- อ่านได้ทุกคน (หน้าลิงก์ลูกค้าต้องแสดงชื่อ/สีหมวด; ไม่ใช่ข้อมูลลับ) — เพิ่ม/แก้/ลบเฉพาะ admin
alter table place_categories enable row level security;
create policy "read place_categories" on place_categories for select to anon, authenticated using (true);
create policy "admin insert place_categories" on place_categories for insert to authenticated with check (app_role() = 'admin');
create policy "admin update place_categories" on place_categories for update to authenticated
  using (app_role() = 'admin') with check (app_role() = 'admin');
create policy "admin delete place_categories" on place_categories for delete to authenticated using (app_role() = 'admin');
