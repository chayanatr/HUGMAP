# HUGMAP — Next.js starter

```bash
npx create-next-app@latest champa-route --ts --tailwind --app --src-dir=false
# คัดลอกไฟล์ในโฟลเดอร์นี้ทับลงไป แล้ว
npm i @supabase/supabase-js @supabase/ssr leaflet react-leaflet @dnd-kit/core @dnd-kit/sortable
npm i -D @types/leaflet
```
1. สร้างโปรเจกต์ Supabase → SQL editor รัน `supabase/schema.sql` แล้ว `supabase/seed.sql`
2. `.env.local`: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_OSRM_URL (default https://router.project-osrm.org)
3. `npm run dev`

> **สำคัญ:** โฟลเดอร์ \`-id-\` และ \`-token-\` ให้เปลี่ยนชื่อเป็น \`[id]\` และ \`[token]\` (dynamic routes ของ Next.js) หลังดาวน์โหลด

## โครงสร้าง
- `app/places` แผนที่สถานที่ · `app/places/new`, `app/places/[id]/edit` ฟอร์ม
- `app/trips/[id]` จัดเส้นทาง · `app/trips/[id]/summary` สรุป · `app/share/[token]` ลิงก์ลูกค้า
- `components/MapView.tsx` Leaflet (โหลดแบบ dynamic, ssr:false)
- `lib/geo.ts` ระยะทาง ตารางเวลา จัดลำดับอัตโนมัติ ใกล้เส้นทาง (logic เดียวกับต้นแบบ)
- `lib/categories.ts` หมวด สี ไอคอน · `lib/types.ts` · `lib/supabase.ts`

## งานที่เหลือให้ Claude Code
- สร้าง UI ตาม `../README.md` และต้นแบบ `../design/HUGMAP v1.dc.html`
- Auth (Supabase) แยก role: admin (จัดการสถานที่) / staff (จัดเส้นทาง)
- ใช้ OSRM route legs แทนค่าประมาณใน `estimateLeg` และส่ง geometry ไป RPC `places_near_route`
