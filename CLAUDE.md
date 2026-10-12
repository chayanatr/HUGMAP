# CLAUDE.md — HUGMAP

ไฟล์นี้คือคำสั่งถาวรสำหรับ Claude Code ในโปรเจกต์นี้ อ่านทุกครั้งก่อนเริ่มงาน

## โปรเจกต์
HUGMAP คือเว็บแอปสำหรับพนักงานบริษัททัวร์และผู้ดูแลระบบ ใช้บันทึกสถานที่ท่องเที่ยวใน สปป.ลาว และจัดเส้นทางให้ลูกค้า
- UI ภาษาไทยทั้งหมด
- ใช้งานได้ทั้ง Desktop / Tablet / Mobile

## ลำดับการอ่าน (ห้ามข้าม)
1. `design/HUGMAP Design System.dc.html` — แหล่งอ้างอิงหลักของสี ตัวอักษร ระยะ มุมโค้ง เงา และ component (เปิดในเบราว์เซอร์)
2. `README.md` — สเปกของทุกหน้า ทุกค่า และพฤติกรรม
3. `screenshots/` — ภาพของแต่ละหน้าบน Tablet และ Mobile
4. `design/HUGMAP.dc.html` — ต้นแบบที่กดใช้งานได้จริง (ย่อ-ขยายหน้าต่างเพื่อดู breakpoint) ให้ดูโค้ด logic ใน `<script data-dc-script>` ประกอบ
5. `nextjs-starter/` — โครงเริ่มต้น (schema, geo logic, MapView, tailwind tokens)

ห้ามใช้ `design/HUGMAP v1.dc.html` และ `HUGMAP Design System v1.dc.html` (เป็นโทนครามเดิม เก็บไว้อ้างอิงเท่านั้น)

## Stack (ตายตัว)
- **Code**: GitHub — branch `main` = production; ทำงานบน feature branch + Pull Request
- **Framework**: Next.js 14+ App Router, TypeScript strict, Tailwind (ใช้ token จาก `nextjs-starter/tailwind.config.ts` ห้าม hardcode hex นอก config)
- **Host**: Vercel — Preview deployment ต่อ PR, Production จาก `main`
- **Database / Auth / Storage**: Supabase (Postgres + PostGIS, Supabase Auth, Storage bucket `place-photos`)
- **Map**: react-leaflet + Leaflet 1.9 (โหลดแบบ `dynamic(..., { ssr: false })`)
- **Routing**: OSRM ผ่าน `NEXT_PUBLIC_OSRM_URL`
- **Drag & drop**: @dnd-kit/sortable

## Environment variables
| ชื่อ | ที่ใช้ | หมายเหตุ |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | |
| `SUPABASE_SERVICE_ROLE_KEY` | server เท่านั้น (route `/share/[token]`) | ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_OSRM_URL` | client | default `https://router.project-osrm.org` (ทดสอบเท่านั้น) |
| `NEXT_PUBLIC_MAP_TILE_URL` | client | default Esri Canvas Light Gray; production เปลี่ยนเป็น MapTiler/Stadia |

ตั้งค่าทั้งใน `.env.local` และ Vercel → Project Settings → Environment Variables (Preview + Production)

## กฎการเขียนโค้ด
- ตรงตามดีไซน์แบบ high-fidelity: ค่าจาก Design System/README เท่านั้น ห้ามคิดสีหรือขนาดใหม่
- Breakpoints: `md` = 640px, `lg` = 1024px (ตั้งไว้ใน tailwind แล้ว)
- ตัวอักษร: Anuphan (next/font) · ไอคอน: Material Symbols Rounded ผ่าน class `.icon`
- ปุ่มบน mobile ต้องสูงอย่างน้อย 44px · ข้อความต้องมีคอนทราสต์อย่างน้อย 4.5:1
- logic ระยะทาง ตารางเวลา จัดลำดับ และหาสถานที่ใกล้เส้นทาง ใช้ `lib/geo.ts` (port มาจากต้นแบบแล้ว) อย่าเขียนใหม่
- งานฐานข้อมูลทุกครั้งต้องทำเป็น migration ใน `supabase/migrations/` (ใช้ Supabase CLI) ห้ามแก้ผ่าน dashboard อย่างเดียว
- RLS เปิดทุกตาราง: role `admin` (ใน `app_metadata.role`) จัดการ places ได้, `staff` จัดเส้นทางได้
- `supabase/dev-policies.sql` ใช้เฉพาะ local/dev ห้าม apply บน production
- ข้อความ error/toast ใช้ภาษาไทยตาม README

## คำสั่ง
```bash
npm run dev          # local
npm run build        # ต้องผ่านก่อน push
npm run lint
supabase db push     # apply migrations
```

## Definition of done (ทุก PR)
- `npm run build` และ `npm run lint` ผ่าน
- ตรวจหน้าที่แก้ที่ 390px / 834px / 1440px เทียบกับ screenshots และ Design System
- Vercel Preview deploy สำเร็จ แนบลิงก์ preview ใน PR
- ไม่มี secret อยู่ใน repo
