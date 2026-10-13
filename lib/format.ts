const WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** วันที่ของวันที่ N ในทริป เช่น "เสาร์ 14 พ.ย." — iso = start_date (YYYY-MM-DD) */
export function fmtThaiDate(iso: string, plusDays = 0) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + plusDays);
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** แยก "3.6 กม." เป็นตัวเลขกับหน่วยสำหรับ stat 28px + หน่วย 13px */
export function splitUnit(text: string): [string, string] {
  const i = text.indexOf(' ');
  return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)];
}

/** "HH:MM" ↔ นาทีตั้งแต่เที่ยงคืน */
export const clockToMin = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
