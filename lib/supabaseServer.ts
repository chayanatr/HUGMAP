import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client ฝั่ง server เท่านั้น (route /share/[token])
 * - production: ใช้ SUPABASE_SERVICE_ROLE_KEY (ข้าม RLS) แล้วกรองด้วย share_token ในโค้ด
 * - ไม่ตั้ง service role (เช่น dev): ใช้ anon key ที่สิทธิ์น้อยกว่า — บน production ที่ไม่มี service role หน้านี้จะอ่านไม่ได้เพราะ RLS (ปลอดภัยไว้ก่อน)
 * ห้ามนำไปใช้ใน client component: SUPABASE_SERVICE_ROLE_KEY ไม่ขึ้นต้นด้วย NEXT_PUBLIC_ จึงไม่ถูกส่งไปเบราว์เซอร์
 */
export function serverSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
