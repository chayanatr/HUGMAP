import { fetchRoute, type RouteData } from './routes';
import { placesNearRoute } from './supabase';
import { saveDayRoute, type DayData } from './trips';
import type { Place } from './types';

/** เส้นทางของวัน: ใช้ที่ cache ไว้ ถ้าไม่มีคำนวณจาก Google Routes แล้วบันทึกลง DB (null = ไม่มีจุดพอ/สถานที่ยังโหลดไม่ครบ) */
export async function ensureDayRoute(day: DayData, placeMap: Map<string, Place>): Promise<RouteData | null> {
  if (day.route) return day.route;
  if (day.placeIds.length < 2) return null;
  const pts = day.placeIds.map((id) => placeMap.get(id));
  if (pts.some((p) => !p)) return null;
  const route = await fetchRoute(pts as Place[]);
  await saveDayRoute(day.id, day.placeIds, route);
  return route;
}

/** สถานที่ใกล้เส้นทางจริงของวัน (RPC places_near_route) */
export async function roadHitsFor(day: DayData, radiusKm: number, excludeIds: string[]) {
  if (!day.route) return undefined;
  const rows = await placesNearRoute(day.route.geojson, radiusKm, excludeIds);
  return rows.map((r) => ({ id: r.id, distanceKm: r.distance_m / 1000 }));
}
