// แขวง (จังหวัด) ของ สปป.ลาว ทั้ง 18 แห่ง — ใช้กรอกแขวงของสถานที่อัตโนมัติจากตำแหน่งบนแผนที่
// พิกัด = ใจกลางเมืองหลักของแขวงโดยประมาณ ใช้เดาแขวงเมื่อ Google ระบุให้ไม่ได้ (ให้ผู้ใช้ตรวจสอบก่อนบันทึก)

export interface Province {
  key: string;
  /** ชื่อไทย */
  label: string;
  /** ชื่อที่ Google/ภาษาอื่นอาจส่งมา (ตัวพิมพ์เล็ก ไม่รวมคำว่า province/แขวง) */
  aliases: string[];
  lat: number;
  lng: number;
}

export const PROVINCES: Province[] = [
  { key: 'vientiane_capital', label: 'นครหลวงเวียงจันทน์', aliases: ['vientiane capital', 'vientiane prefecture', 'นครหลวงเวียงจันทน์', 'ນະຄອນຫຼວງວຽງຈັນ'], lat: 17.9757, lng: 102.6331 },
  { key: 'vientiane', label: 'แขวงเวียงจันทน์', aliases: ['vientiane', 'เวียงจันทน์', 'ວຽງຈັນ'], lat: 18.5, lng: 102.43 },
  { key: 'phongsaly', label: 'แขวงพงสาลี', aliases: ['phongsaly', 'phongsali', 'พงสาลี', 'ຜົ້ງສາລີ'], lat: 21.6833, lng: 102.1 },
  { key: 'luang_namtha', label: 'แขวงหลวงน้ำทา', aliases: ['luang namtha', 'louang namtha', 'หลวงน้ำทา', 'ຫຼວງນ້ຳທາ'], lat: 20.95, lng: 101.4 },
  { key: 'bokeo', label: 'แขวงบ่อแก้ว', aliases: ['bokeo', 'bo keo', 'บ่อแก้ว', 'ບໍ່ແກ້ວ'], lat: 20.2667, lng: 100.4167 },
  { key: 'oudomxay', label: 'แขวงอุดมไซ', aliases: ['oudomxay', 'oudomxai', 'udomxay', 'อุดมไซ', 'ອຸດົມໄຊ'], lat: 20.6833, lng: 101.9833 },
  { key: 'luang_prabang', label: 'แขวงหลวงพระบาง', aliases: ['luang prabang', 'louangphabang', 'หลวงพระบาง', 'ຫຼວງພະບາງ'], lat: 19.8856, lng: 102.1347 },
  { key: 'xayaboury', label: 'แขวงไซยะบุรี', aliases: ['xayaboury', 'xaignabouli', 'sainyabuli', 'xayabury', 'ไซยะบุรี', 'ไซยะบุลี', 'ໄຊຍະບູລີ'], lat: 19.25, lng: 101.7333 },
  { key: 'houaphanh', label: 'แขวงหัวพัน', aliases: ['houaphanh', 'houaphan', 'huaphanh', 'หัวพัน', 'ຫົວພັນ'], lat: 20.4167, lng: 104.05 },
  { key: 'xiengkhouang', label: 'แขวงเชียงขวาง', aliases: ['xiengkhouang', 'xiangkhouang', 'xieng khouang', 'xiangkhoang', 'เชียงขวาง', 'ຊຽງຂວາງ'], lat: 19.4547, lng: 103.2 },
  { key: 'xaisomboun', label: 'แขวงไซสมบูน', aliases: ['xaisomboun', 'xaisomboon', 'saysomboun', 'ไซสมบูน', 'ໄຊສົມບູນ'], lat: 18.9, lng: 103.0 },
  { key: 'bolikhamsai', label: 'แขวงบอลิคำไซ', aliases: ['bolikhamsai', 'borikhamxay', 'bolikhamxay', 'บอลิคำไซ', 'บริคัมไซ', 'ບໍລິຄຳໄຊ'], lat: 18.3833, lng: 103.65 },
  { key: 'khammouane', label: 'แขวงคำม่วน', aliases: ['khammouane', 'khammouan', 'khammuan', 'คำม่วน', 'ຄຳມ່ວນ'], lat: 17.4, lng: 104.8 },
  { key: 'savannakhet', label: 'แขวงสะหวันนะเขต', aliases: ['savannakhet', 'savannaket', 'สะหวันนะเขต', 'สวันนะเขต', 'ສະຫວັນນະເຂດ'], lat: 16.55, lng: 104.75 },
  { key: 'salavan', label: 'แขวงสาละวัน', aliases: ['salavan', 'saravane', 'salavane', 'สาละวัน', 'ສາລະວັນ'], lat: 15.7167, lng: 106.4167 },
  { key: 'sekong', label: 'แขวงเซกอง', aliases: ['sekong', 'xekong', 'เซกอง', 'ເຊກອງ'], lat: 15.35, lng: 106.7167 },
  { key: 'champasak', label: 'แขวงจำปาสัก', aliases: ['champasak', 'champassak', 'จำปาสัก', 'ຈຳປາສັກ'], lat: 15.1202, lng: 105.799 },
  { key: 'attapeu', label: 'แขวงอัตตะปือ', aliases: ['attapeu', 'attopeu', 'attapu', 'อัตตะปือ', 'ອັດຕະປື'], lat: 14.8, lng: 106.8333 },
];

export const PROVINCE_LABEL = Object.fromEntries(PROVINCES.map((p) => [p.key, p.label])) as Record<string, string>;
export const PROVINCE_KEYS = PROVINCES.map((p) => p.key);

const STRIP = /\b(province|prefecture|district|city)\b|แขวง|ແຂວງ|จังหวัด/g;
const norm = (s: string) => s.toLowerCase().replace(STRIP, ' ').replace(/\s+/g, ' ').trim();

/** จับคู่ชื่อแขวงที่ Google ส่งมา (อังกฤษ/ไทย/ลาว) กับ key; null = ไม่รู้จัก */
export function matchProvince(name: string | null | undefined): string | null {
  if (!name) return null;
  const raw = name.toLowerCase();
  const n = norm(name);
  if (!n) return null;
  // "Vientiane Prefecture / Capital / นครหลวง…" = นครหลวงเวียงจันทน์ ส่วน "Vientiane Province" = แขวงเวียงจันทน์
  if (/prefecture|capital|นครหลวง|ນະຄອນຫຼວງ/.test(raw)) return 'vientiane_capital';
  for (const p of PROVINCES) if (p.key !== 'vientiane_capital' && p.aliases.some((a) => norm(a) === n)) return p.key;
  for (const p of PROVINCES) if (p.key !== 'vientiane_capital' && p.aliases.some((a) => n.includes(norm(a)) || norm(a).includes(n))) return p.key;
  return null;
}

const rad = (d: number) => (d * Math.PI) / 180;
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const x = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

/** เดาแขวงจากเมืองหลักที่ใกล้ที่สุด — ประมาณการเท่านั้น (ใกล้เขตแดนอาจคลาดเคลื่อน) */
export function guessProvince(p: { lat: number; lng: number }): string {
  return PROVINCES.map((c) => ({ key: c.key, d: km(p, c) })).sort((a, b) => a.d - b.d)[0].key;
}

/** "เมืองวังเวียง · แขวงเวียงจันทน์" สำหรับแสดงในการ์ด */
export function regionText(p: { province: string; district?: string | null }) {
  const prov = PROVINCE_LABEL[p.province] ?? '';
  return [p.district, prov].filter(Boolean).join(' · ');
}
