import type { Leg } from './types';

type LL = { lat: number; lng: number };

export interface RouteData {
  /** [lat, lng] สำหรับวาดบนแผนที่ */
  line: [number, number][];
  /** GeoJSON LineString ([lng, lat]) สำหรับเก็บลง trip_days.route_geom และ RPC places_near_route */
  geojson: { type: 'LineString'; coordinates: [number, number][] };
  /** ช่วงจากจุด i ไปจุด i+1 */
  legs: Leg[];
}

/** Google Routes รับจุดแวะกลางได้สูงสุด 25 → รวมต้นทาง/ปลายทางเป็น 27 จุด */
export const MAX_ROUTE_POINTS = 27;

/** < 0.7 กม. = เดิน 4.5 กม./ชม. นอกนั้นใช้เวลาขับจาก Google */
export function toLeg(km: number, driveMin: number): Leg {
  const walk = km < 0.7;
  return { km, walk, min: Math.max(1, walk ? Math.round((km / 4.5) * 60) : Math.round(driveMin)) };
}

/** เส้นทางตามถนนจริงจาก Google Routes (ต้องโหลด Maps JS API แล้ว และเปิดใช้ Routes API ในโปรเจกต์ Google Cloud) */
export async function fetchRoute(points: LL[]): Promise<RouteData> {
  if (points.length < 2) throw new Error('ต้องมีอย่างน้อย 2 จุด');
  if (points.length > MAX_ROUTE_POINTS) throw new Error('จุดแวะมากเกินกว่าที่ Google Routes รองรับต่อเส้นทาง');
  const { Route } = (await google.maps.importLibrary('routes')) as google.maps.RoutesLibrary;
  const { routes } = await Route.computeRoutes({
    origin: points[0],
    destination: points[points.length - 1],
    intermediates: points.slice(1, -1).map((location) => ({ location })),
    travelMode: 'DRIVING' as google.maps.TravelMode,
    fields: ['path', 'legs'],
  });
  const route = routes?.[0];
  if (!route?.path?.length || route.legs?.length !== points.length - 1) throw new Error('ไม่พบเส้นทาง');
  const line = route.path.map((p) => [p.lat, p.lng] as [number, number]);
  return {
    line,
    geojson: { type: 'LineString', coordinates: line.map(([lat, lng]) => [lng, lat] as [number, number]) },
    legs: route.legs.map((l) => toLeg((l.distanceMeters ?? 0) / 1000, (l.durationMillis ?? 0) / 60000)),
  };
}
