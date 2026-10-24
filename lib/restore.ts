// นำเข้าไฟล์สำรอง (JSON จาก lib/backup.ts) กลับเข้าระบบ — ผู้ดูแลเท่านั้น (RLS)
// โหมดรวมข้อมูล: เพิ่ม/อัปเดตตาม id เท่านั้น ไม่ลบอะไรที่มีอยู่แล้ว จึงนำเข้าซ้ำได้ปลอดภัย
import type { Backup } from './backup';
import { supabase } from './supabase';

const CHUNK = 200;

export class RestoreError extends Error {}

const isArr = (v: unknown): v is unknown[] => Array.isArray(v);

/** อ่านและตรวจรูปแบบไฟล์สำรอง — โยน RestoreError (ข้อความไทย) ถ้าไม่ใช่ไฟล์ของ HUGMAP */
export function parseBackup(text: string): Backup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new RestoreError('ไฟล์นี้ไม่ใช่ไฟล์สำรอง (อ่านเป็น JSON ไม่ได้)');
  }
  const b = raw as Partial<Backup> | null;
  if (!b || b.app !== 'HUGMAP') throw new RestoreError('ไฟล์นี้ไม่ใช่ไฟล์สำรองของ HUGMAP');
  if (b.schema_version !== 1) throw new RestoreError('ไฟล์สำรองเป็นเวอร์ชันที่ระบบนี้ยังไม่รองรับ');
  if (![b.categories, b.places, b.trips, b.trip_days, b.trip_stops].every(isArr)) throw new RestoreError('ไฟล์สำรองไม่สมบูรณ์ (ขาดข้อมูลบางส่วน)');
  return b as Backup;
}

type Step = { table: string; label: string; rows: Record<string, unknown>[] };

/** สร้างลำดับนำเข้า (ตารางแม่ก่อนตารางลูก) */
function steps(b: Backup): Step[] {
  const places = b.places.map(({ lat, lng, ...p }) => ({ ...p, location: `SRID=4326;POINT(${lng} ${lat})` }));
  return [
    { table: 'place_categories', label: 'หมวดสถานที่', rows: b.categories as unknown as Record<string, unknown>[] },
    { table: 'places', label: 'สถานที่', rows: places },
    { table: 'trips', label: 'ทริป', rows: b.trips },
    { table: 'trip_days', label: 'วันของทริป', rows: b.trip_days },
    { table: 'trip_stops', label: 'จุดแวะ', rows: b.trip_stops },
  ];
}

export interface RestoreResult {
  places: number;
  categories: number;
  trips: number;
}

/** นำเข้าตามลำดับ; หยุดที่ข้อผิดพลาดแรก (ที่นำเข้าไปแล้วคงอยู่ — นำเข้าซ้ำได้) */
export async function restoreBackup(b: Backup, onProgress?: (label: string, done: number, total: number) => void): Promise<RestoreResult> {
  const plan = steps(b);
  const total = plan.reduce((n, s) => n + s.rows.length, 0);
  let done = 0;
  for (const s of plan) {
    const conflict = s.table === 'place_categories' ? 'key' : 'id';
    for (let i = 0; i < s.rows.length; i += CHUNK) {
      const part = s.rows.slice(i, i + CHUNK);
      onProgress?.(s.label, done, total);
      const { error } = await supabase().from(s.table).upsert(part, { onConflict: conflict });
      if (error) throw new RestoreError(`นำเข้า${s.label}ไม่สำเร็จ: ${error.message}`);
      done += part.length;
    }
  }
  onProgress?.('เสร็จสิ้น', total, total);
  return { places: b.places.length, categories: b.categories.length, trips: b.trips.length };
}
