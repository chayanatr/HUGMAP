# Prompt สำหรับ Claude Code

คัดลอกข้อความในกรอบด้านล่างไปวางใน Claude Code ครั้งแรก โดยเปิดโฟลเดอร์ `design_handoff_hugmap/` ไว้ใน workspace

---

```
คุณจะสร้างเว็บแอป "HUGMAP" ใช้บันทึกสถานที่ท่องเที่ยวใน สปป.ลาว และจัดเส้นทางท่องเที่ยวให้ลูกค้าของบริษัททัวร์
UI ภาษาไทยทั้งหมด และต้องใช้งานได้ทั้ง Desktop, Tablet และ Mobile

ก่อนเขียนโค้ดใด ๆ ให้อ่านตามลำดับนี้ให้ครบ แล้วสรุปความเข้าใจให้ผมยืนยันก่อน:
1. CLAUDE.md — กฎและ stack ของโปรเจกต์
2. design/HUGMAP Design System.dc.html — สี ตัวอักษร ระยะ มุมโค้ง เงา component (แหล่งอ้างอิงหลัก)
3. README.md — สเปกทุกหน้า ทุกค่า และพฤติกรรม
4. screenshots/ — ภาพทุกหน้าบน Tablet (tablet-*.png) และ Mobile (mobile-*.png)
   - tablet-01-plan / mobile-01-plan: หน้าจัดเส้นทาง
   - tablet-02-places, tablet-03-place-selected / mobile-02-place-selected: หน้าแผนที่สถานที่
   - tablet-04-form / mobile-03-form: ฟอร์มเพิ่ม/แก้ไขสถานที่
   - tablet-05-summary / mobile-04-summary: หน้าสรุปเส้นทาง
   (Desktop ใช้เลย์เอาต์เดียวกับ Tablet แต่ rail 72px, panel 400px และมีการ์ดสรุปสีเขียวเข้มลอยมุมขวาล่างของแผนที่หน้าจัดเส้นทาง ตาม README)
5. design/HUGMAP.dc.html — ต้นแบบที่กดใช้งานได้จริง; logic อยู่ใน <script data-dc-script>
6. nextjs-starter/ — โครงเริ่มต้นที่ต้องใช้ต่อ

Stack ที่ต้องใช้:
- GitHub เก็บโค้ด (main = production, ทำงานผ่าน feature branch + PR)
- Vercel เป็น host (Preview ทุก PR, Production จาก main)
- Supabase เป็นฐานข้อมูล (Postgres + PostGIS), Auth และ Storage
- Next.js 14 App Router + TypeScript + Tailwind + react-leaflet + @dnd-kit

ทำงานเป็นเฟส จบแต่ละเฟสแล้วหยุดให้ผมตรวจก่อนไปเฟสถัดไป:

เฟส 0 — ตั้งโปรเจกต์
- สร้าง Next.js app จาก nextjs-starter/ (เปลี่ยนชื่อโฟลเดอร์ -id- → [id], -token- → [token])
- ติดตั้ง dependencies ตาม nextjs-starter/README.md
- init git, สร้าง repo GitHub "hugmap", push main
- เชื่อม Vercel กับ repo, ใส่ env ตาม CLAUDE.md
- ตั้ง Supabase CLI; แปลง supabase/schema.sql เป็น migration แรก, seed.sql เป็น seed
- ผลลัพธ์: deploy หน้าเปล่า + AppNav สีเขียวขึ้น Vercel ได้

เฟส 1 — App shell + Design tokens
- Layout rail / panel / map / bottom nav ตาม README "โครงร่วม" ทั้ง 3 breakpoint
- Component พื้นฐาน: Button, IconButton, Input, Select, Card, LabelValue, Pill, Toast, DarkCard
- เทียบกับ Design System ให้ตรงทุกค่า

เฟส 2 — แผนที่สถานที่ /places + ฟอร์ม /places/new, /places/[id]/edit
- อ่าน/เขียน places จาก Supabase (insert location เป็น SRID=4326;POINT(lng lat))
- ตัวกรองเมือง/หมวด/ค้นหา, เลือกหมุด ↔ การ์ด, การ์ดลอยรายละเอียด
- ฟอร์มพร้อม validation ตาม README, ปักหมุดบนแผนที่, อัปโหลดรูปไป Storage

เฟส 3 — จัดเส้นทาง /trips/[id]
- สร้าง/โหลดทริป, หลายวัน, ลากเรียง (dnd-kit) + ปุ่มเลื่อนขึ้นบน mobile, บันทึกด้วย RPC reorder_day
- ตารางเวลา + เวลาเดินทางจาก OSRM (cache leg_km/leg_min และ route_geom ลง trip_days)
- จัดลำดับอัตโนมัติด้วย autoOrder() ใน lib/geo.ts
- สถานที่ใกล้เส้นทางด้วย RPC places_near_route (รัศมี 0.5/1/2/3/5 กม.) + กล่อง "ระหว่างทาง"

เฟส 4 — สรุปเส้นทาง /trips/[id]/summary + ลิงก์ลูกค้า /share/[token]
- สร้าง share_token, หน้าอ่านอย่างเดียวผ่าน server (service role กรองด้วย token)
- print CSS สำหรับพิมพ์/บันทึกเป็น PDF

เฟส 5 — Auth + RLS + QA
- Supabase Auth (email), role admin/staff, ลบ dev policies
- ตรวจทุกหน้าที่ 390 / 834 / 1440px เทียบ screenshots, ทดสอบ build, เปิด PR

ข้อห้าม:
- ห้ามคิดสี/ขนาด/ฟอนต์ใหม่ ใช้จาก Design System และ tailwind.config.ts เท่านั้น
- ห้ามใช้ไฟล์ v1 (โทนคราม)
- ห้ามใช้ tile.openstreetmap.org (ถูกบล็อกตาม tile usage policy)
- ห้าม commit secret

เริ่มจากอ่านเอกสารทั้งหมดแล้วสรุปให้ผม: (1) หน้าที่ต้องสร้างและ route (2) ตารางฐานข้อมูล (3) แผนเฟส 0 ทีละขั้น
```

---

## Prompt สั้นสำหรับงานต่อเนื่อง
- `ทำเฟส 2 ต่อ อ่าน CLAUDE.md และส่วน "1. แผนที่สถานที่" กับ "2. ฟอร์ม" ใน README อีกครั้ง แล้วเทียบกับ screenshots/tablet-02..04 และ mobile-02..03`
- `ตรวจหน้า /trips/[id] ที่ 390/834/1440px เทียบกับ screenshots และ Design System แล้วแก้ทุกจุดที่ไม่ตรง`
- `เพิ่ม migration ใหม่สำหรับ <งาน> ตามกฎใน CLAUDE.md แล้วอัปเดต types ใน lib/types.ts`
