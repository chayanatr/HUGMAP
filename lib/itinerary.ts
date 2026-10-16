// ตารางเดินทางสำหรับลูกค้า/ทีมรถตู้: แปลงข้อมูลสรุปทริปเป็นรายการเวลา + ลิงก์ Google Maps (ใช้ร่วมกันทั้งหน้าเว็บและข้อความสำหรับส่ง LINE)
import { fmtThaiDate, fmtThaiRange } from './format';
import { fmtKm } from './geo';
import { summarize, type DayView, type SummaryData } from './summary';

type LL = { lat: number; lng: number };

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (m: number) => `${pad(Math.floor(m / 60) % 24)}.${pad(m % 60)}`;
/** 08.00 น. */
export const fmtTimeTh = (m: number) => `${hhmm(m)} น.`;
/** 10.30–11.15 น. */
export const fmtRangeTh = (a: number, b: number) => `${hhmm(a)}–${hhmm(b)} น.`;

/** ลิงก์ปักหมุดตามพิกัด (ถูกตำแหน่งเสมอ เปิดได้ทั้งแอปและเว็บ) */
export const mapsPin = (p: LL) => `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)}%2C${p.lng.toFixed(6)}`;

const MAX_WAYPOINTS = 9; // ข้อจำกัดของลิงก์เส้นทาง Google Maps
/** ลิงก์เส้นทางทั้งวัน (ต้นทาง → จุดแวะ → ปลายทาง) สำหรับคนขับ; null = จุดไม่พอ. truncated = จุดกลางเกินที่ลิงก์รองรับ */
export function mapsDirections(points: LL[]): { url: string; truncated: boolean } | null {
  if (points.length < 2) return null;
  const mid = points.slice(1, -1);
  const used = mid.slice(0, MAX_WAYPOINTS);
  const ll = (p: LL) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const q = new URLSearchParams({ api: '1', origin: ll(points[0]), destination: ll(points[points.length - 1]), travelmode: 'driving' });
  if (used.length) q.set('waypoints', used.map(ll).join('|'));
  return { url: `https://www.google.com/maps/dir/?${q.toString()}`, truncated: mid.length > MAX_WAYPOINTS };
}

export type ItineraryKind = 'start' | 'stop' | 'break' | 'travel' | 'end';
export interface ItineraryItem {
  kind: ItineraryKind;
  startMin: number | null;
  endMin: number | null;
  /** end: เวลาถึงโดยประมาณ */
  approx?: boolean;
  title: string;
  note: string | null;
  link: string | null;
  /** บรรทัดข้อมูลเสริม เช่น ค่าเข้า / เวลาเปิด */
  info: string[];
  km?: number;
}
export interface ItineraryDay {
  id: string;
  dayNo: number;
  title: string;
  dateLabel: string;
  items: ItineraryItem[];
  route: { url: string; truncated: boolean } | null;
}

function dayItems(d: DayView): ItineraryItem[] {
  const items: ItineraryItem[] = [];
  if (d.start) items.push({ kind: 'start', startMin: d.departMin, endMin: null, title: d.start.name, note: d.startNote, link: mapsPin(d.start), info: [] });

  const firstName = d.stops[0]?.place.name ?? d.end?.name;
  if (d.startLeg && firstName)
    items.push({ kind: 'travel', startMin: d.departMin, endMin: d.departMin + d.startLeg.min, title: `เดินทางไป${firstName}`, note: null, link: null, info: [], km: d.startLeg.km });

  d.stops.forEach((s, i) => {
    const p = s.place;
    items.push({
      kind: 'stop',
      startMin: s.startMin,
      endMin: s.endMin,
      title: p.name,
      note: s.note ?? p.description,
      link: mapsPin(p),
      info: [p.open_hours ? `เปิด ${p.open_hours}` : '', p.fee ? `ค่าเข้า ${p.fee}` : ''].filter(Boolean),
    });
    if (s.breakLabel && s.breakMin) items.push({ kind: 'break', startMin: s.endMin, endMin: s.endMin + s.breakMin, title: s.breakLabel, note: null, link: null, info: [] });
    const nextName = d.stops[i + 1]?.place.name ?? d.end?.name;
    if (s.leg && nextName) {
      const from = s.endMin + s.breakMin;
      items.push({ kind: 'travel', startMin: from, endMin: from + s.leg.min, title: `เดินทางไป${nextName}`, note: null, link: null, info: [], km: s.leg.km });
    }
  });

  if (d.end) items.push({ kind: 'end', startMin: d.arriveMin, endMin: null, approx: true, title: d.end.name, note: d.endNote, link: mapsPin(d.end), info: [] });
  return items;
}

/** จุดตามลำดับของวัน (ต้นทาง → จุดแวะ → ปลายทาง) */
export const dayPoints = (d: DayView): LL[] => [...(d.start ? [d.start] : []), ...d.places, ...(d.end ? [d.end] : [])];

export function buildItinerary(data: SummaryData) {
  const s = summarize(data);
  const days: ItineraryDay[] = s.days.map((d) => ({
    id: d.id,
    dayNo: d.dayNo,
    title: d.title?.trim() ?? '',
    dateLabel: fmtThaiDate(data.trip.start_date, d.dayNo - 1),
    items: dayItems(d),
    route: mapsDirections(dayPoints(d)),
  }));
  return { days, range: fmtThaiRange(data.trip.start_date, days.length), totals: s.totals };
}

/** เวลาของรายการ: 08.00 น. / 10.30–11.15 น. / ประมาณ 16.00 น. */
export function itemTime(it: ItineraryItem) {
  if (it.startMin == null) return '';
  if (it.endMin != null) return fmtRangeTh(it.startMin, it.endMin);
  return it.approx ? `ประมาณ ${fmtTimeTh(it.startMin)}` : fmtTimeTh(it.startMin);
}

/** ข้อความสำหรับคัดลอกไปส่ง LINE ให้ลูกค้า/ทีมรถตู้ (ลิงก์ Google Maps กดได้ในแอป) */
export function itineraryText(data: SummaryData): string {
  const { days } = buildItinerary(data);
  const { trip } = data;
  const out: string[] = [`HUGLAO | ${trip.name}`];
  if (trip.subtitle) out.push(trip.subtitle);
  if (trip.lodging_note) out.push(trip.lodging_note);
  out.push('');
  for (const d of days) {
    out.push(`วันที่ ${d.dayNo}${d.title ? ` | ${d.title}` : ''} (${d.dateLabel})`, '');
    for (const it of d.items) {
      const time = itemTime(it);
      const km = it.kind === 'travel' && it.km ? ` (${fmtKm(it.km)})` : '';
      out.push(`${time ? `${time} | ` : ''}${it.title}${km}`);
      if (it.note) out.push(it.note);
      if (it.info.length) out.push(it.info.join(' · '));
      if (it.link) out.push('โลเคชัน:', it.link);
      out.push('');
    }
    if (d.route) out.push(`เส้นทางทั้งวัน (Google Maps)${d.route.truncated ? ' — แสดงเฉพาะ 9 จุดแรก' : ''}:`, d.route.url, '');
  }
  if (trip.footer_note) out.push(trip.footer_note, '');
  out.push('เวลาเดินทางเป็นค่าประมาณ อาจเปลี่ยนตามสภาพถนนและการจราจร');
  return out.join('\n');
}
