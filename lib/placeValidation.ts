import { LAO_BOUNDS } from './categories';

/** ตรวจข้อมูลสถานที่ (ฟอร์มเต็มและฟอร์มเร็วบนแผนที่ใช้ร่วมกัน) */
export function validatePlace(f: { name: string; lat: string; lng: string; duration: string; province: string }) {
  const e: Record<string, string> = {};
  if (!f.province) e.province = 'กรุณาเลือกแขวง';
  const lat = parseFloat(f.lat), lng = parseFloat(f.lng);
  if (!f.name.trim()) e.name = 'กรุณากรอกชื่อสถานที่';
  if (isNaN(lat) || isNaN(lng)) e.coord = 'กรุณาระบุพิกัด หรือคลิกบนแผนที่';
  else if (lat < LAO_BOUNDS.latMin || lat > LAO_BOUNDS.latMax || lng < LAO_BOUNDS.lngMin || lng > LAO_BOUNDS.lngMax)
    e.coord = 'พิกัดอยู่นอกขอบเขต สปป.ลาว (ละติจูด 13.9–22.5, ลองจิจูด 100.0–107.7)';
  if (f.duration && !(+f.duration > 0)) e.duration = 'เวลาแนะนำต้องมากกว่า 0';
  return e;
}