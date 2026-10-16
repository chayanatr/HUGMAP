import { nearestSegment, placeHit, routePoints } from './geo';
import { toLeg } from './routes';
import type { SummaryData, SummaryDay } from './summary';
import { serverSupabase } from './supabaseServer';
import type { Endpoint, Place, StopMeta, Trip } from './types';

const SHARE_RADIUS_KM = 1;
const TOKEN_FORMAT = /^[0-9a-f]{32}$/i;

interface SharedDay {
  id: string;
  day_no: number;
  route: { type: 'LineString'; coordinates: [number, number][] } | null;
  start: Endpoint | null;
  end: Endpoint | null;
  start_leg_km: number | null;
  start_leg_min: number | null;
  title: string | null;
  start_min: number | null;
  start_note: string | null;
  end_note: string | null;
  stops: {
    place: Place; leg_km: number | null; leg_min: number | null;
    note: string | null; stay_min: number | null; break_label: string | null; break_min: number | null;
  }[];
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
    const start = d.start ?? null;
    const end = d.end ?? null;
    const legRows = end ? d.stops : d.stops.slice(0, -1);
    const startLegOk = !start || (d.start_leg_km != null && d.start_leg_min != null);
    const routeable = places.length > 0 ? places.length + (start ? 1 : 0) + (end ? 1 : 0) > 1 : !!start && !!end;
    const cached = d.route && routeable && startLegOk && legRows.every((s) => s.leg_km != null && s.leg_min != null);
    const pts = routePoints(start, places, end);
    return {
      id: d.id,
      dayNo: d.day_no,
      places,
      title: d.title ?? null,
      startMin: d.start_min ?? null,
      startNote: d.start_note ?? null,
      endNote: d.end_note ?? null,
      stopMeta: Object.fromEntries(
        d.stops
          .filter((s) => s.note || s.stay_min || s.break_label || s.break_min)
          .map((s) => [s.place.id, { note: s.note, stayMin: s.stay_min, breakLabel: s.break_label, breakMin: s.break_min } satisfies StopMeta]),
      ),
      start,
      end,
      startLeg: cached && start ? toLeg(Number(d.start_leg_km), Number(d.start_leg_min)) : null,
      legs: cached ? legRows.map((s) => toLeg(Number(s.leg_km), Number(s.leg_min))) : null,
      line: d.route ? d.route.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) : null,
      nearby: d.nearby.map((n) =>
        placeHit({ place: n.place, distanceKm: n.distance_m / 1000, segment: nearestSegment(n.place, pts) }, places.length, !!start, !!end),
      ),
    };
  });  return { trip: { ...raw.trip, share_token: null }, radiusKm: SHARE_RADIUS_KM, days };
}
