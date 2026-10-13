import { nearestSegment } from './geo';
import { toLeg } from './routes';
import type { SummaryData, SummaryDay } from './summary';
import { serverSupabase } from './supabaseServer';
import type { Place, Trip } from './types';

const SHARE_RADIUS_KM = 1;
const TOKEN_FORMAT = /^[0-9a-f]{32}$/i;

interface SharedDay {
  id: string;
  day_no: number;
  route: { type: 'LineString'; coordinates: [number, number][] } | null;
  stops: { place: Place; leg_km: number | null; leg_min: number | null }[];
  nearby: { place: Place; distance_m: number }[];
}
interface SharedTrip {
  trip: Omit<Trip, 'share_token'>;
  days: SharedDay[];
}

/** ข้อมูลหน้าลูกค้า (อ่านอย่างเดียว) ตาม share_token — null = ไม่พบ/ลิงก์ไม่ถูกต้อง */
export async function fetchSharedSummary(token: string): Promise<SummaryData | null> {
  if (!TOKEN_FORMAT.test(token)) return null;
  const { data, error } = await serverSupabase().rpc('shared_trip', { p_token: token, p_radius_m: SHARE_RADIUS_KM * 1000 });
  if (error) throw error;
  if (!data) return null;
  const raw = data as SharedTrip;

  const days = raw.days.map((d): SummaryDay => {
    const places = d.stops.map((s) => s.place);
    const legRows = d.stops.slice(0, -1);
    const cached = d.route && legRows.length > 0 && legRows.every((s) => s.leg_km != null && s.leg_min != null);
    return {
      id: d.id,
      dayNo: d.day_no,
      places,
      legs: cached ? legRows.map((s) => toLeg(Number(s.leg_km), Number(s.leg_min))) : null,
      line: d.route ? d.route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) : null,
      nearby: d.nearby.map((n) => ({ place: n.place, distanceKm: n.distance_m / 1000, segment: nearestSegment(n.place, places) })),
    };
  });
  return { trip: { ...raw.trip, share_token: null }, radiusKm: SHARE_RADIUS_KM, days };
}
