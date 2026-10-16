import type { SupabaseClient } from '@supabase/supabase-js';
import type { RouteData } from './routes';
import { toLeg } from './routes';
import { supabase } from './supabase';
import type { Endpoint, StopMeta, Trip } from './types';

export interface DayData {
  id: string;
  dayNo: number;
  placeIds: string[];
  /** ชื่อวัน เช่น วังเวียง–เมืองเฟือง (ใช้ในตารางเดินทางลูกค้า) */
  title: string | null;
  /** เวลาออกเดินทางของวันนี้ (นาทีจากเที่ยงคืน) — null = ใช้เวลาเริ่มของทริป */
  startMin: number | null;
  startNote: string | null;
  endNote: string | null;
  /** รายละเอียดแต่ละจุดแวะ ตาม place_id (ไม่มีรายการ = ไม่ได้ตั้ง) */
  stopMeta: Record<string, StopMeta>;
  /** จุดรับ/ส่งลูกค้าของวัน (null = ยังไม่ตั้ง) */
  start: Endpoint | null;
  end: Endpoint | null;
  /** เส้นทางที่ cache ไว้ใน DB (null = ยังไม่เคยคำนวณ หรือลำดับเพิ่งเปลี่ยน) */
  route: RouteData | null;
}

export interface TripData {
  trip: Trip;
  days: DayData[];
}

const TRIP_COLUMNS = 'id,code,name,client_name,pax,start_date,day_start_min,share_token,subtitle,lodging_note,footer_note';

/** TR-<พ.ศ.>-<เลข 3 หลัก> เช่น TR-2569-118 */
const makeCode = () => `TR-${new Date().getFullYear() + 543}-${Math.floor(100 + Math.random() * 900)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

/** id = 'current' → ทริปล่าสุด (ถ้ายังไม่มีเลยคืน null — ไม่สร้างทริปว่างให้เอง ผู้ใช้สร้างที่หน้า /trips) */
export async function fetchTrip(idOrCurrent: string): Promise<TripData | null> {
  const db = supabase();
  let trip: Trip | null;
  if (idOrCurrent === 'current') {
    const { data, error } = await db.from('trips').select(TRIP_COLUMNS).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    trip = data as Trip | null;
  } else {
    const { data, error } = await db.from('trips').select(TRIP_COLUMNS).eq('id', idOrCurrent).maybeSingle();
    if (error) throw error;
    trip = data as Trip | null;
  }
  if (!trip) return null;
  return { trip, days: await loadDays(db, trip.id) };
}

/** ทริปล่าสุด โดย "ไม่" สร้างให้ถ้ายังไม่มี (ใช้ในหน้าที่แค่อ่านสถานะ เช่น ป้าย "ในทริป") */
export async function fetchLatestTrip(): Promise<TripData | null> {
  const db = supabase();
  const { data, error } = await db.from('trips').select(TRIP_COLUMNS).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { trip: data as Trip, days: await loadDays(db, (data as Trip).id) };
}

export interface TripListItem {
  trip: Trip;
  dayCount: number;
}

/** ทริปทั้งหมด ใหม่สุดก่อน พร้อมจำนวนวัน */
export async function fetchTrips(): Promise<TripListItem[]> {
  const { data, error } = await supabase()
    .from('trips')
    .select(`${TRIP_COLUMNS},trip_days(count)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as (Trip & { trip_days: { count: number }[] })[]).map(({ trip_days, ...trip }) => ({
    trip: trip as Trip,
    dayCount: trip_days?.[0]?.count ?? 0,
  }));
}

/** คำนวณเส้นทางได้เมื่อมีอย่างน้อย 2 จุด และมีจุดแวะหรือมีทั้งจุดรับและจุดส่ง */
export const canRoute = (stopCount: number, start: Endpoint | null, end: Endpoint | null) =>
  stopCount > 0 ? stopCount + (start ? 1 : 0) + (end ? 1 : 0) > 1 : !!start && !!end;

/** วัน + จุดรับ/ส่ง + จุดแวะ + เส้นทางที่ cache ไว้ */
export async function loadDays(db: SupabaseClient, tripId: string): Promise<DayData[]> {
  const [daysRes, routesRes] = await Promise.all([
    db
      .from('trip_days')
      .select('id,day_no,title,start_min,start_note,end_note,start_name,start_lat,start_lng,end_name,end_lat,end_lng,start_leg_km,start_leg_min,trip_stops(place_id,position,leg_km,leg_min,note,stay_min,break_label,break_min)')
      .eq('trip_id', tripId)
      .order('day_no'),
    db.rpc('trip_day_routes', { p_trip: tripId }),
  ]);
  if (daysRes.error) throw daysRes.error;
  const geoByDay = new Map<string, { type: 'LineString'; coordinates: [number, number][] }>(
    ((routesRes.data ?? []) as { day_id: string; geojson: { type: 'LineString'; coordinates: [number, number][] } }[]).map((r) => [r.day_id, r.geojson]),
  );

  type StopRow = {
    place_id: string; position: number; leg_km: number | null; leg_min: number | null;
    note: string | null; stay_min: number | null; break_label: string | null; break_min: number | null;
  };
  type DayRow = {
    id: string; day_no: number; trip_stops: StopRow[];
    title: string | null; start_min: number | null; start_note: string | null; end_note: string | null;
    start_name: string | null; start_lat: number | null; start_lng: number | null;
    end_name: string | null; end_lat: number | null; end_lng: number | null;
    start_leg_km: number | null; start_leg_min: number | null;
  };
  return (daysRes.data as DayRow[]).map((d) => {
    const stops = [...d.trip_stops].sort((a, b) => a.position - b.position);
    const start = d.start_lat != null && d.start_lng != null ? { name: d.start_name ?? 'จุดรับ', lat: d.start_lat, lng: d.start_lng } : null;
    const end = d.end_lat != null && d.end_lng != null ? { name: d.end_name ?? 'จุดส่ง', lat: d.end_lat, lng: d.end_lng } : null;
    const geojson = geoByDay.get(d.id);
    // จุดแวะที่ต้องมีระยะ/เวลา cache: ทุกจุดยกเว้นสุดท้าย (+ สุดท้าย → จุดส่ง ถ้ามีจุดส่ง)
    const legRows = end ? stops : stops.slice(0, -1);
    const startLegOk = !start || (d.start_leg_km != null && d.start_leg_min != null);
    const cached = geojson && canRoute(stops.length, start, end) && startLegOk && legRows.every((s) => s.leg_km != null && s.leg_min != null);
    return {
      id: d.id,
      dayNo: d.day_no,
      placeIds: stops.map((s) => s.place_id),
      title: d.title,
      startMin: d.start_min,
      startNote: d.start_note,
      endNote: d.end_note,
      stopMeta: Object.fromEntries(
        stops
          .filter((s) => s.note || s.stay_min || s.break_label || s.break_min)
          .map((s) => [s.place_id, { note: s.note, stayMin: s.stay_min, breakLabel: s.break_label, breakMin: s.break_min } satisfies StopMeta]),
      ),
      start,
      end,
      route: cached
        ? {
            geojson,
            line: geojson.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
            startLeg: start ? toLeg(Number(d.start_leg_km), Number(d.start_leg_min)) : null,
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

export async function updateTrip(
  id: string,
  patch: Partial<Pick<Trip, 'name' | 'client_name' | 'pax' | 'start_date' | 'day_start_min' | 'share_token' | 'subtitle' | 'lodging_note' | 'footer_note'>>,
) {
  const { error } = await supabase().from('trips').update(patch).eq('id', id);
  if (error) throw error;
}

export async function addDay(tripId: string, dayNo: number, start: Endpoint | null = null): Promise<string> {
  const { data, error } = await supabase()
    .from('trip_days')
    .insert({ trip_id: tripId, day_no: dayNo, start_name: start?.name ?? null, start_lat: start?.lat ?? null, start_lng: start?.lng ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/** ตั้ง/ล้างจุดรับ-ส่งของวัน (null = ล้าง) พร้อมล้าง cache เส้นทางของวันนั้น */
export async function setDayEndpoints(dayId: string, start: Endpoint | null, end: Endpoint | null) {
  const { error } = await supabase()
    .from('trip_days')
    .update({
      start_name: start?.name ?? null, start_lat: start?.lat ?? null, start_lng: start?.lng ?? null,
      end_name: end?.name ?? null, end_lat: end?.lat ?? null, end_lng: end?.lng ?? null,
      route_geom: null, start_leg_km: null, start_leg_min: null,
    })
    .eq('id', dayId);
  if (error) throw error;
}

/** ตั้ง/ล้างข้อมูลประกอบของวัน (ชื่อวัน เวลาออกเดินทาง หมายเหตุจุดรับ/ส่ง) — ไม่กระทบเส้นทาง */
export async function updateDayInfo(dayId: string, info: Pick<DayData, 'title' | 'startMin' | 'startNote' | 'endNote'>) {
  const { error } = await supabase()
    .from('trip_days')
    .update({ title: info.title, start_min: info.startMin, start_note: info.startNote, end_note: info.endNote })
    .eq('id', dayId);
  if (error) throw error;
}

/** ตั้งรายละเอียดของจุดแวะ (หมายเหตุ เวลาอยู่ พักหลังจุดนี้) — ไม่กระทบเส้นทาง */
export async function updateStopMeta(dayId: string, placeId: string, meta: StopMeta) {
  const { error } = await supabase()
    .from('trip_stops')
    .update({ note: meta.note, stay_min: meta.stayMin, break_label: meta.breakLabel, break_min: meta.breakMin })
    .eq('day_id', dayId)
    .eq('place_id', placeId);
  if (error) throw error;
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
    p_start_leg: route.startLeg ? { km: Number(route.startLeg.km.toFixed(3)), min: route.startLeg.min } : null,
  });
  if (error) throw error;
  return data as boolean;
}

/** ยกเลิกลิงก์ลูกค้า: ลบ share_token — ลิงก์เดิมเปิดไม่ได้ทันที และการแชร์ครั้งถัดไปจะได้ token ใหม่ที่ต่างจากเดิม */
export async function revokeShareToken(tripId: string) {
  await updateTrip(tripId, { share_token: null });
}

/** สร้าง share_token ถ้ายังไม่มี แล้วคืนค่า */
export async function ensureShareToken(trip: Trip): Promise<string> {
  if (trip.share_token) return trip.share_token;
  const token = crypto.randomUUID().replaceAll('-', '');
  await updateTrip(trip.id, { share_token: token });
  return token;
}