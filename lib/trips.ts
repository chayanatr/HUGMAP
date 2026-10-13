import type { SupabaseClient } from '@supabase/supabase-js';
import type { RouteData } from './routes';
import { toLeg } from './routes';
import { supabase } from './supabase';
import type { Trip } from './types';

export interface DayData {
  id: string;
  dayNo: number;
  placeIds: string[];
  /** เส้นทางที่ cache ไว้ใน DB (null = ยังไม่เคยคำนวณ หรือลำดับเพิ่งเปลี่ยน) */
  route: RouteData | null;
}

export interface TripData {
  trip: Trip;
  days: DayData[];
}

const TRIP_COLUMNS = 'id,code,name,client_name,pax,start_date,day_start_min,share_token';

/** TR-<พ.ศ.>-<เลข 3 หลัก> เช่น TR-2569-118 */
const makeCode = () => `TR-${new Date().getFullYear() + 543}-${Math.floor(100 + Math.random() * 900)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

/** โหลดซ้อนกัน (เช่น React StrictMode) ต้องไม่สร้างทริปเริ่มต้นซ้ำ — ใช้ Promise เดียวร่วมกัน */
let creatingDefault: Promise<Trip> | null = null;
const createDefaultTrip = () => (creatingDefault ??= createTrip().finally(() => (creatingDefault = null)));

/** id = 'current' → ทริปล่าสุด (ถ้ายังไม่มีเลย สร้างทริปเริ่มต้นให้) */
export async function fetchTrip(idOrCurrent: string): Promise<TripData | null> {
  const db = supabase();
  let trip: Trip | null;
  if (idOrCurrent === 'current') {
    const { data, error } = await db.from('trips').select(TRIP_COLUMNS).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    trip = (data as Trip | null) ?? (await createDefaultTrip());
  } else {
    const { data, error } = await db.from('trips').select(TRIP_COLUMNS).eq('id', idOrCurrent).maybeSingle();
    if (error) throw error;
    trip = data as Trip | null;
  }
  if (!trip) return null;
  return { trip, days: await loadDays(db, trip.id) };
}

/** วัน + จุดแวะ + เส้นทางที่ cache ไว้ */
export async function loadDays(db: SupabaseClient, tripId: string): Promise<DayData[]> {
  const [daysRes, routesRes] = await Promise.all([
    db.from('trip_days').select('id,day_no,trip_stops(place_id,position,leg_km,leg_min)').eq('trip_id', tripId).order('day_no'),
    db.rpc('trip_day_routes', { p_trip: tripId }),
  ]);
  if (daysRes.error) throw daysRes.error;
  const geoByDay = new Map<string, { type: 'LineString'; coordinates: [number, number][] }>(
    ((routesRes.data ?? []) as { day_id: string; geojson: { type: 'LineString'; coordinates: [number, number][] } }[]).map((r) => [r.day_id, r.geojson]),
  );

  type StopRow = { place_id: string; position: number; leg_km: number | null; leg_min: number | null };
  return (daysRes.data as { id: string; day_no: number; trip_stops: StopRow[] }[]).map((d) => {
    const stops = [...d.trip_stops].sort((a, b) => a.position - b.position);
    const geojson = geoByDay.get(d.id);
    const legRows = stops.slice(0, -1);
    const cached = geojson && stops.length > 1 && legRows.every((s) => s.leg_km != null && s.leg_min != null);
    return {
      id: d.id,
      dayNo: d.day_no,
      placeIds: stops.map((s) => s.place_id),
      route: cached
        ? {
            geojson,
            line: geojson.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
            legs: legRows.map((s) => toLeg(Number(s.leg_km), Number(s.leg_min))),
          }
        : null,
    };
  });
}

/** สร้างทริปเริ่มต้นพร้อมวันที่ 1 */
export async function createTrip(): Promise<Trip> {
  const db = supabase();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from('trips')
      .insert({ code: makeCode(), name: 'ทริปใหม่', client_name: 'ลูกค้า', pax: 1, start_date: todayIso() })
      .select(TRIP_COLUMNS)
      .single();
    if (error?.code === '23505') continue; // รหัสซ้ำ — สุ่มใหม่
    if (error) throw error;
    const { error: dayErr } = await db.from('trip_days').insert({ trip_id: data.id, day_no: 1 });
    if (dayErr) throw dayErr;
    return data as Trip;
  }
  throw new Error('สร้างรหัสทริปไม่สำเร็จ');
}

export async function updateTrip(id: string, patch: Partial<Pick<Trip, 'name' | 'client_name' | 'pax' | 'start_date' | 'day_start_min' | 'share_token'>>) {
  const { error } = await supabase().from('trips').update(patch).eq('id', id);
  if (error) throw error;
}

export async function addDay(tripId: string, dayNo: number): Promise<string> {
  const { data, error } = await supabase().from('trip_days').insert({ trip_id: tripId, day_no: dayNo }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteDay(dayId: string) {
  const { error } = await supabase().rpc('delete_day', { p_day: dayId });
  if (error) throw error;
}

/** บันทึกลำดับสถานที่ทั้งวันใน transaction เดียว (ล้าง cache เส้นทางของวันนั้นด้วย) */
export async function reorderDay(dayId: string, placeIds: string[]) {
  const { error } = await supabase().rpc('reorder_day', { p_day: dayId, p_place_ids: placeIds });
  if (error) throw error;
}

/** cache เส้นทาง + ระยะ/เวลาแต่ละช่วง — คืน false ถ้าลำดับใน DB เปลี่ยนไปแล้ว (ผลเก่า ไม่บันทึก) */
export async function saveDayRoute(dayId: string, placeIds: string[], route: RouteData) {
  const { data, error } = await supabase().rpc('save_day_route', {
    p_day: dayId,
    p_place_ids: placeIds,
    p_geojson: route.geojson,
    p_legs: route.legs.map((l) => ({ km: Number(l.km.toFixed(3)), min: l.min })),
  });
  if (error) throw error;
  return data as boolean;
}

/** สร้าง share_token ถ้ายังไม่มี แล้วคืนค่า */
export async function ensureShareToken(trip: Trip): Promise<string> {
  if (trip.share_token) return trip.share_token;
  const token = crypto.randomUUID().replaceAll('-', '');
  await updateTrip(trip.id, { share_token: token });
  return token;
}
