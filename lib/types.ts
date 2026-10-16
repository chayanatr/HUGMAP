/** key ของหมวดในตาราง place_categories (หมวดเริ่มต้น: temple, cafe, food, stay, nature, market, view, museum, gift + หมวดที่ผู้ดูแลเพิ่ม) */
export type CategoryKey = string;

export interface Place {
  id: string;
  name: string;
  category: CategoryKey;
  /** key ของแขวง (lib/provinces.ts) */
  province: string;
  /** เมือง/อำเภอ เช่น เมืองวังเวียง (ไม่บังคับ) */
  district: string | null;
  lat: number;
  lng: number;
  open_hours: string | null;   // "08:00–17:00"
  fee: string | null;          // "20,000 กีบ"
  duration_min: number;        // เวลาแนะนำ
  description: string | null;
  photos: string[];
}

export interface Trip {
  id: string;
  code: string;                // TR-2569-118
  name: string;
  client_name: string;
  pax: number;
  start_date: string;          // ISO date
  day_start_min: number;       // 540 = 09:00
  share_token: string | null;
  /** ข้อความประกอบตารางเดินทางลูกค้า */
  subtitle: string | null;       // รถตู้ส่วนตัวพร้อมคนขับ 2 วัน 1 คืน
  lodging_note: string | null;   // พักเมืองเฟือง 1 คืน
  footer_note: string | null;
}

/** รายละเอียดของจุดแวะในวันหนึ่ง (ผูกตามสถานที่) */
export interface StopMeta {
  note: string | null;
  /** เวลาอยู่ที่จุดนี้ (นาที) — null = ใช้เวลาแนะนำของสถานที่ */
  stayMin: number | null;
  /** พักหลังจุดนี้ เช่น รับประทานอาหารกลางวัน */
  breakLabel: string | null;
  breakMin: number | null;
}

/** จุดรับ/ส่งลูกค้าของวัน — ชื่อ + พิกัดอิสระ (ไม่ต้องอยู่ใน places) */
export interface Endpoint {
  name: string;
  lat: number;
  lng: number;
}

export interface ScheduledStop {
  place: Place;
  index: number;
  startMin: number;
  endMin: number;
  waitMin: number;
  closesBeforeEnd: boolean;
  leg: Leg | null;
  /** เวลาอยู่จริง (นาที) = stay_min หรือเวลาแนะนำของสถานที่ */
  durationMin: number;
  note: string | null;
  breakLabel: string | null;
  breakMin: number;
}
export interface Leg { km: number; min: number; walk: boolean }
/** segment = แทรกหลังจุดแวะลำดับนี้ (-1 = ก่อนจุดแรก); between = ข้อความ "ช่วงจุดรับ–จุด 1" */
export interface NearbyHit { place: Place; distanceKm: number; segment: number; between?: string }
