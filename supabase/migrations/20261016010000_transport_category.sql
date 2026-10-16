-- หมวด "จุดรับส่ง" สำหรับสนามบิน ด่านชายแดน สถานีรถ ท่าเรือ — ผู้ดูแลแก้ชื่อ/ไอคอน/สีได้ที่ /places/categories
insert into place_categories (key, label, icon, hue, sort)
values ('transport', 'จุดรับส่ง/ท่าเดินทาง', 'flight', 200, 10)
on conflict (key) do nothing;
