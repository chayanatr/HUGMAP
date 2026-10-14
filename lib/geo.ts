import type { Endpoint, Leg, NearbyHit, Place, ScheduledStop } from './types';

type LL = { lat: number; lng: number };
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LL, b: LL) {
  const x = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
}

/** ระยะจากจุด p ถึงเส้นตรง a→b (กม.) — equirectangular, แม่นพอสำหรับระยะไม่กี่สิบกม. */
export function pointToSegmentKm(p: LL, a: LL, b: LL) {
  const k = Math.cos(rad(p.lat));
  const ax = (a.lng - p.lng) * k, ay = a.lat - p.lat, bx = (b.lng - p.lng) * k, by = b.lat - p.lat;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  let t = L2 ? -(ax * dx + ay * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx, y = ay + t * dy;
  return Math.sqrt(x * x + y * y) * 111.32;
}

/** ค่าประมาณเมื่อยังไม่มีผลจาก Google Routes (lib/routes.ts) */
export function estimateLeg(a: LL, b: LL): Leg {
  const km = haversineKm(a, b) * 1.35;
  const walk = km < 0.7;
  const min = Math.max(1, Math.round(walk ? (km / 4.5) * 60 : (km / (km < 8 ? 22 : 40)) * 60 + 2));
  return { km, min, walk };
}

export function parseOpenHours(s?: string | null) {
  const m = (s || '').match(/(\d{1,2}):(\d{2})\D+(\d{1,2}):(\d{2})/);
  return m ? { open: +m[1] * 60 + +m[2], close: +m[3] * 60 + +m[4] } : null;
}

/** จุดทั้งหมดของเส้นทางวัน: จุดรับ? → จุดแวะ → จุดส่ง? */
export const routePoints = (start: Endpoint | null, stops: LL[], end: Endpoint | null): LL[] => [...(start ? [start] : []), ...stops, ...(end ? [end] : [])];

export interface ScheduleEnds {
  /** จุดรับ/ส่งของวัน และช่วงจุดรับ → จุดแวะแรกจาก Google Routes (ไม่มี = ใช้ค่าประมาณ) */
  start?: LL | null;
  end?: LL | null;
  startLeg?: Leg | null;
}

/** dayStartMin = เวลาออกจากจุดรับ (ถ้ามีจุดรับ) ไม่เช่นนั้นคือเวลาถึงจุดแวะแรก; legs[i] = จุดแวะ i → ถัดไป (จุดสุดท้าย → จุดส่ง ถ้ามี) */
export function schedule(places: Place[], dayStartMin = 540, legs?: (Leg | null)[], ends: ScheduleEnds = {}) {
  let t = dayStartMin, km = 0, travelMin = 0;
  let startLeg: Leg | null = null;
  if (ends.start && places[0]) {
    startLeg = ends.startLeg ?? estimateLeg(ends.start, places[0]);
  } else if (ends.start && ends.end && !places.length) {
    startLeg = ends.startLeg ?? estimateLeg(ends.start, ends.end); // ไม่มีจุดแวะ: จุดรับ → จุดส่งตรงๆ
  }
  if (startLeg) { km += startLeg.km; travelMin += startLeg.min; t += startLeg.min; }
  const stops: ScheduledStop[] = places.map((p, i) => {
    const oh = parseOpenHours(p.open_hours);
    const waitMin = oh && t < oh.open ? oh.open - t : 0;
    const startMin = t + waitMin;
    const endMin = startMin + (p.duration_min || 30);
    const next = places[i + 1] ?? ends.end;
    const leg = next ? legs?.[i] ?? estimateLeg(p, next) : null;
    if (leg) { km += leg.km; travelMin += leg.min; }
    t = endMin + (leg?.min ?? 0);
    return { place: p, index: i, startMin, endMin, waitMin, closesBeforeEnd: !!oh && endMin > oh.close, leg };
  });
  return {
    stops, km, travelMin, startLeg,
    firstMin: stops[0]?.startMin ?? null,
    lastMin: stops.at(-1)?.endMin ?? null,
    /** เวลาถึงจุดส่ง (null = ไม่มีจุดส่ง) */
    arriveMin: ends.end ? t : null,
  };
}
/** ฝั่ง client — production ใช้ RPC places_near_route กับ geometry จริง; route = จุดรับ? + จุดแวะ + จุดส่ง? (segment ดิบตาม route นี้) */
export function nearbyAlongRoute(route: LL[], candidates: Place[], radiusKm: number, exclude: Set<string>): NearbyHit[] {
  if (!route.length) return [];
  return candidates
    .filter((p) => !exclude.has(p.id))
    .map((p) => {
      let best = Infinity, segment = 0;
      if (route.length === 1) best = haversineKm(p, route[0]);
      else for (let i = 0; i < route.length - 1; i++) { const d = pointToSegmentKm(p, route[i], route[i + 1]); if (d < best) { best = d; segment = i; } }
      return { place: p, distanceKm: best, segment };
    })
    .filter((h) => h.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** แปลง segment ดิบ (ตามรายการจุดรับ+จุดแวะ+จุดส่ง) เป็น "แทรกหลังจุดแวะลำดับที่" + ข้อความช่วง (n = จำนวนจุดแวะ) */
export function placeHit(h: NearbyHit, n: number, hasStart: boolean, hasEnd: boolean): NearbyHit {
  const segment = h.segment - (hasStart ? 1 : 0);
  if (n === 0) return { ...h, segment: -1, between: 'ระหว่างจุดรับ–จุดส่ง' };
  if (!hasStart && !hasEnd && n < 2) return { ...h, segment: 0, between: 'ใกล้จุด 1' };
  const from = segment < 0 ? 'จุดรับ' : `จุด ${segment + 1}`;
  const to = segment + 1 >= n ? 'จุดส่ง' : `จุด ${segment + 2}`;
  return { ...h, segment, between: `ช่วง${from}–${to}` };
}

/** ลำดับตามแนวเส้นทาง (0 = ต้นทาง): ใช้เรียงสถานที่แนะนำเป็นลำดับเดินทางเมื่อวันยังไม่มีจุดแวะ */
export function alongRouteIndex(p: LL, line: LL[]) {
  let best = Infinity, idx = 0;
  line.forEach((q, i) => { const d = haversineKm(p, q); if (d < best) { best = d; idx = i; } });
  return idx / Math.max(1, line.length - 1);
}
/** ช่วง (index ของจุดเริ่มช่วง) ที่ใกล้สถานที่ p ที่สุด — ใช้ป้าย "ช่วงจุด 2–3" และตำแหน่งแทรก */
export function nearestSegment(p: LL, route: LL[]) {
  if (route.length < 2) return 0;
  let best = Infinity, seg = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = pointToSegmentKm(p, route[i], route[i + 1]);
    if (d < best) { best = d; seg = i; }
  }
  return seg;
}

const isEvening =(p: Place) => (parseOpenHours(p.open_hours)?.open ?? 0) >= 15 * 60;

/** ตรึงจุดแรก → nearest neighbour → 2-opt; สถานที่เปิดช่วงเย็นไปไว้ท้าย */
export function autoOrder(places: Place[]): Place[] {
  if (places.length < 3) return places;
  const [first, ...rest] = places;
  const evening = rest.filter(isEvening), pool = rest.filter((p) => !isEvening(p));
  const route = [first];
  while (pool.length) {
    const last = route[route.length - 1];
    let bi = 0, bd = Infinity;
    pool.forEach((p, i) => { const d = haversineKm(last, p); if (d < bd) { bd = d; bi = i; } });
    route.push(pool.splice(bi, 1)[0]);
  }
  const D = haversineKm;
  for (let guard = 0, improved = true; improved && guard < 50; guard++) {
    improved = false;
    for (let i = 1; i < route.length - 1; i++)
      for (let k = i + 1; k < route.length; k++) {
        const a = route[i - 1], b = route[i], c = route[k], d = route[k + 1];
        const delta = D(a, c) + (d ? D(b, d) : 0) - D(a, b) - (d ? D(c, d) : 0);
        if (delta < -1e-6) { route.splice(i, k - i + 1, ...route.slice(i, k + 1).reverse()); improved = true; }
      }
  }
  return [...route, ...evening];
}

export const fmtKm = (km: number) => (km < 1 ? Math.round(km * 100) * 10 + ' ม.' : (km < 10 ? km.toFixed(1) : Math.round(km)) + ' กม.');
export const fmtDuration = (m: number) => (m < 60 ? m + ' นาที' : Math.floor(m / 60) + ' ชม.' + (m % 60 ? ' ' + (m % 60) + ' นาที' : ''));
export const fmtClock = (m: number) => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
