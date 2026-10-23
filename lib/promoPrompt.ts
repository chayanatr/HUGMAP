// พรอมต์สำหรับให้ ChatGPT สร้างภาพโปรโมท/ภาพนำเสนอทริปตามตารางเวลา
// ไม่รวมชื่อลูกค้า รหัสทริป และลิงก์ (ภาพโปรโมทเป็นสื่อสาธารณะ) — แอปไม่ได้ส่งข้อมูลไป ChatGPT เอง ผู้ใช้คัดลอกพรอมต์ไปวางเอง
import { buildItinerary, itemTime } from './itinerary';
import type { SummaryData } from './summary';

export type PromoFormat = 'poster' | 'per-day' | 'slides';

export const PROMO_FORMATS: { key: PromoFormat; label: string; hint: string }[] = [
  { key: 'poster', label: 'โปสเตอร์ทั้งทริป', hint: '1 ภาพ แนวตั้ง 4:5 สำหรับโพสต์ Facebook/Instagram' },
  { key: 'per-day', label: '1 ภาพต่อวัน', hint: 'แนวตั้ง 9:16 สำหรับ LINE / Stories ส่งลูกค้าทีละวัน' },
  { key: 'slides', label: 'สไลด์นำเสนอลูกค้า', hint: 'ภาพ 16:9 ปก + วันละ 1 ภาพ + ภาพสรุป' },
];

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** ตารางเวลาแบบย่อสำหรับใส่ในพรอมต์ (ไม่มีลิงก์/พิกัด) */
export function promoItinerary(data: SummaryData): string {
  const { days } = buildItinerary(data);
  const out: string[] = [];
  for (const d of days) {
    out.push(`วันที่ ${d.dayNo}${d.title ? ` | ${d.title}` : ''} (${d.dateLabel})`);
    for (const it of d.items) {
      const time = itemTime(it);
      if (it.kind === 'travel') {
        const min = it.startMin != null && it.endMin != null ? it.endMin - it.startMin : 0;
        if (min >= 10) out.push(`  - ${time}: เดินทางประมาณ ${min >= 60 ? `${Math.floor(min / 60)} ชม.${min % 60 ? ` ${min % 60} นาที` : ''}` : `${min} นาที`}`);
        continue;
      }
      const label = it.kind === 'start' ? 'จุดรับ: ' : it.kind === 'end' ? 'ถึง: ' : '';
      out.push(`  - ${time}: ${label}${it.title}${it.note ? ` — ${clip(it.note.replace(/\s+/g, ' '), 110)}` : ''}`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}

export function buildPromoPrompt(data: SummaryData, format: PromoFormat): string {
  const { trip } = data;
  const dayCount = data.days.length;
  const spec: Record<PromoFormat, string> = {
    poster: 'สร้างภาพโปสเตอร์ตารางเดินทางทั้งทริป 1 ภาพ แนวตั้งสัดส่วน 4:5 แบ่งเป็นช่วงแต่ละวันชัดเจน เรียงเวลาจากบนลงล่าง มีภาพถ่าย/ไอคอนประกอบเล็กๆ ของแต่ละสถานที่',
    'per-day': `สร้างภาพแยก 1 ภาพต่อ 1 วัน (รวม ${dayCount} ภาพ) แนวตั้งสัดส่วน 9:16 เหมาะส่งทาง LINE และ Stories ให้สร้างทีละภาพ เริ่มจากวันที่ 1 แล้วรอให้ผมสั่งสร้างวันถัดไป แต่ละภาพมีไทม์ไลน์เวลาของวันนั้น`,
    slides: `สร้างภาพสไลด์สัดส่วน 16:9 สำหรับนำเสนอลูกค้า: ภาพปก 1 ภาพ + วันละ 1 ภาพ (${dayCount} ภาพ) + ภาพสรุป (เว้นช่องราคา/เบอร์ติดต่อให้ผมเติมเอง) ให้สร้างทีละภาพ เริ่มจากภาพปกแล้วรอผมสั่งต่อ`,
  };
  return [
    `ช่วยสร้างภาพสำหรับโปรโมทและนำเสนอทริปท่องเที่ยว สปป.ลาว ให้ลูกค้า ตามตารางเวลาด้านล่าง`,
    '',
    `รูปแบบภาพ: ${spec[format]}`,
    '',
    'สไตล์และข้อกำหนด:',
    '- แบรนด์ HUGLAO โทนเขียวเข้ม ทอง และขาว ดูสะอาด พรีเมียม อบอุ่น มีบรรยากาศท่องเที่ยวลาว',
    '- ข้อความภาษาไทยต้องสะกดถูกต้อง ตัวใหญ่ อ่านง่าย ชื่อสถานที่และเวลาต้องตรงตามตารางทุกตัวอักษร ห้ามแต่งหรือเพิ่มสถานที่ เวลา ราคา หรือเบอร์โทรที่ไม่มีในตาราง',
    '- เว้นพื้นที่ว่างโล่งสีพื้นเรียบไว้ที่ด้านบนกลางภาพ สูงประมาณ 12% ของภาพ สำหรับวางโลโก้ HUGLAO ทีหลัง ห้ามวาดโลโก้หรือเขียนคำว่า HUGLAO เองในพื้นที่นั้น (ถ้าผมแนบไฟล์โลโก้มาด้วย ให้ใช้โลโก้นั้นวางในพื้นที่นี้)',
    '- ใช้ภาพบรรยากาศสถานที่แบบภาพถ่ายสวยงามหรือภาพประกอบสไตล์เดียวกันทั้งชุด',
    '- ถ้าตัวหนังสือในภาพผิดหรือเพี้ยน ให้แก้แล้วสร้างใหม่',
    '',
    'ข้อมูลทริป:',
    `ชื่อทริป: ${trip.name}`,
    ...(trip.subtitle ? [`รายละเอียด: ${trip.subtitle}`] : []),
    ...(trip.lodging_note ? [`ที่พัก: ${trip.lodging_note}`] : []),
    '',
    'ตารางเดินทาง:',
    promoItinerary(data),
    ...(trip.footer_note ? ['', `หมายเหตุ: ${clip(trip.footer_note.replace(/\s+/g, ' '), 200)}`] : []),
  ].join('\n');
}
