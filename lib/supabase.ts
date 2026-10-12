import { createBrowserClient } from '@supabase/ssr';

export const supabase = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/** สถานที่ใกล้เส้นทางจริง (geojson LineString จาก OSRM) */
export async function placesNearRoute(routeGeojson: unknown, radiusKm: number, excludeIds: string[]) {
  const { data, error } = await supabase().rpc('places_near_route', {
    route_geojson: routeGeojson, radius_m: radiusKm * 1000, exclude_ids: excludeIds,
  });
  if (error) throw error;
  return data as { id: string; distance_m: number }[];
}
