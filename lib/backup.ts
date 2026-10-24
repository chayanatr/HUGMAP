// ส่งออกข้อมูลสำรอง (ผู้ดูแล): สถานที่ หมวด ทริป (วัน/จุดแวะ) เป็นไฟล์ JSON และสถานที่เป็น CSV (เปิดใน Excel/Google Sheets ได้)
// อ่านผ่านสิทธิ์ของผู้ใช้ที่ล็อกอิน (RLS) แล้วสร้างไฟล์ในเบราว์เซอร์ — ไม่ส่งข้อมูลไปที่อื่น
import { PROVINCE_LABEL } from './provinces';
import { supabase } from './supabase';

const PAGE = 1000; // PostgREST คืนสูงสุด 1,000 แถวต่อคำขอ → ดึงเป็นหน้า

async function fetchAll<T>(table: string, columns: string, order: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase()
      .from(table)
      .select(columns)
      .order(order)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export interface BackupPlace {
  id: string;
  name: string;
  category: string;
  province: string;
  district: string | null;
  lat: number;
  lng: number;
  open_hours: string | null;
  fee: string | null;
  duration_min: number;
  description: string | null;
  photos: string[];
}
export interface BackupCategory {
  key: string;
  label: string;
  icon: string;
  hue: number;
  sort: number;
}

export interface Backup {
  app: 'HUGMAP';
  schema_version: 1;
  exported_at: string;
  note: string;
  counts: { places: number; categories: number; trips: number; trip_days: number; trip_stops: number };
  categories: BackupCategory[];
  places: BackupPlace[];
  trips: Record<string, unknown>[];
  trip_days: Record<string, unknown>[];
  trip_stops: Record<string, unknown>[];
}

/** ดึงข้อมูลทั้งหมดที่ควรสำรอง — ไม่รวม share_token (ลิงก์ลูกค้า) เส้นทางที่ cache ไว้ (คำนวณใหม่ได้) และข้อมูลบัญชีผู้ใช้ */
export async function buildBackup(): Promise<Backup> {
  const [categories, places, trips, trip_days, trip_stops] = await Promise.all([
    fetchAll<BackupCategory>('place_categories', 'key,label,icon,hue,sort', 'sort'),
    fetchAll<BackupPlace>('places', 'id,name,category,province,district,lat,lng,open_hours,fee,duration_min,description,photos', 'name'),
    fetchAll<Record<string, unknown>>('trips', 'id,code,name,client_name,pax,start_date,day_start_min,subtitle,lodging_note,footer_note,created_at', 'created_at'),
    fetchAll<Record<string, unknown>>(
      'trip_days',
      'id,trip_id,day_no,title,start_min,start_note,end_note,start_name,start_lat,start_lng,end_name,end_lat,end_lng',
      'id',
    ),
    fetchAll<Record<string, unknown>>('trip_stops', 'id,day_id,place_id,position,note,stay_min,break_label,break_min', 'id'),
  ]);
  return {
    app: 'HUGMAP',
    schema_version: 1,
    exported_at: new Date().toISOString(),
    note: 'ไฟล์สำรองข้อมูล HUGMAP: รูปภาพเก็บเป็นลิงก์ (ไฟล์รูปจริงอยู่ใน Supabase Storage); ไม่รวมลิงก์ลูกค้า เส้นทางที่ cache และบัญชีผู้ใช้',
    counts: { places: places.length, categories: categories.length, trips: trips.length, trip_days: trip_days.length, trip_stops: trip_stops.length },
    categories,
    places,
    trips,
    trip_days,
    trip_stops,
  };
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** CSV ของสถานที่ (UTF-8 + BOM ให้ Excel อ่านภาษาไทยถูก) */
export function placesCsv(places: BackupPlace[], categories: BackupCategory[]): string {
  const label = new Map(categories.map((c) => [c.key, c.label]));
  const head = ['ชื่อ', 'หมวด', 'แขวง', 'เมือง', 'ละติจูด', 'ลองจิจูด', 'เวลาเปิด', 'ค่าเข้า', 'เวลาแนะนำ(นาที)', 'รายละเอียด', 'จำนวนรูป', 'ลิงก์รูป'];
  const rows = places.map((p) => [
    p.name,
    label.get(p.category) ?? p.category,
    PROVINCE_LABEL[p.province] ?? p.province,
    p.district,
    p.lat,
    p.lng,
    p.open_hours,
    p.fee,
    p.duration_min,
    p.description,
    p.photos.length,
    p.photos.join(' '),
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export const stampName = (prefix: string, ext: string) => `${prefix}-${new Date().toISOString().slice(0, 10)}.${ext}`;

export function downloadFile(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

const LAST_KEY = 'hugmap:last-backup';
export function lastBackupAt(): Date | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}
export function markBackup() {
  try {
    localStorage.setItem(LAST_KEY, new Date().toISOString());
  } catch {
    // เก็บไม่ได้ = ไม่แสดงวันที่สำรองล่าสุด
  }
}
