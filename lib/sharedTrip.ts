import { PLACE_COLUMNS } from './places';
import { buildSummaryData, type RoadHits, type SummaryData } from './summary';
import { serverSupabase } from './supabaseServer';
import { fetchTripByToken } from './trips';
import type { Place } from './types';

const SHARE_RADIUS_KM = 1;
const TOKEN_FORMAT = /^[0-9a-f]{32}$/i;

/** ข้อมูลหน้าลูกค้า (อ่านอย่างเดียว) ตาม share_token — null = ไม่พบ/ลิงก์ไม่ถูกต้อง */
export async function fetchSharedSummary(token: string): Promise<SummaryData | null> {
  if (!TOKEN_FORMAT.test(token)) return null;
  const db = serverSupabase();
  const tripData = await fetchTripByToken(db, token);
  if (!tripData) return null;

  const { data, error } = await db.from('places').select(PLACE_COLUMNS);
  if (error) throw error;
  const places = data as Place[];

  const inTrip = tripData.days.flatMap((d) => d.placeIds);
  const roadHits: RoadHits = {};
  await Promise.all(
    tripData.days.map(async (d) => {
      if (!d.route) return;
      const { data: rows, error: rpcError } = await db.rpc('places_near_route', {
        route_geojson: d.route.geojson,
        radius_m: SHARE_RADIUS_KM * 1000,
        exclude_ids: inTrip,
      });
      if (!rpcError) roadHits[d.id] = (rows as { id: string; distance_m: number }[]).map((r) => ({ id: r.id, distanceKm: r.distance_m / 1000 }));
    }),
  );
  return buildSummaryData({ tripData, places, radiusKm: SHARE_RADIUS_KM, roadHits });
}
