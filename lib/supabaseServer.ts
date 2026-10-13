import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client ฝั่ง server สำหรับหน้าลิงก์ลูกค้า /share/[token]
 * ใช้ anon key เท่านั้น — ข้อมูลอ่านผ่านฟังก์ชัน shared_trip(token) (security definer) ซึ่งคืนเฉพาะทริปที่ตรงกับ token
 * จึงไม่ต้องเก็บ service role key (กุญแจที่ข้าม RLS ได้ทั้งหมด) ไว้บนเซิร์ฟเวอร์
 *
 * ต้องไม่แคชผลลัพธ์: Next.js 14 แคช fetch แบบ POST (ที่ supabase-js ใช้เรียก RPC) ไว้ใน Data Cache
 * ทำให้ทริปที่ถูกลบ/แก้ไขแล้วลูกค้ายังเห็นข้อมูลเก่า จึงบังคับ cache: 'no-store' ทุกคำขอ
 */
export function serverSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}
