// ฟอร์มสถานที่ (ใช้ร่วมกันทั้งเพิ่ม/แก้ไข)
// สร้าง UI ตาม design_handoff_champa_route/README.md และ design/Champa Route.dc.html
'use client';
import { LAO_BOUNDS } from '@/lib/categories';

export function validatePlace(f: { name: string; lat: string; lng: string; duration: string }) {
  const e: Record<string, string> = {};
  const lat = parseFloat(f.lat), lng = parseFloat(f.lng);
  if (!f.name.trim()) e.name = 'กรุณากรอกชื่อสถานที่';
  if (isNaN(lat) || isNaN(lng)) e.coord = 'กรุณาระบุพิกัด หรือคลิกบนแผนที่';
  else if (lat < LAO_BOUNDS.latMin || lat > LAO_BOUNDS.latMax || lng < LAO_BOUNDS.lngMin || lng > LAO_BOUNDS.lngMax)
    e.coord = 'พิกัดอยู่นอกขอบเขต สปป.ลาว (ละติจูด 13.9–22.5, ลองจิจูด 100.0–107.7)';
  if (f.duration && !(+f.duration > 0)) e.duration = 'เวลาแนะนำต้องมากกว่า 0';
  return e;
}

export default function PlaceForm() {
  // TODO: ฟิลด์ตาม README §2, แผนที่ pick mode (MapView onPick + pin), upload ไป Storage 'place-photos'
  return null;
}
