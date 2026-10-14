'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NEARBY_FILTERS, type NearbyFilterKey } from './categories';
import { alongRouteIndex, autoOrder, haversineKm, nearbyAlongRoute, nearestSegment, placeHit, routePoints, schedule } from './geo';
import { ensureDayRoute } from './dayRoutes';
import { fetchRoute } from './routes';
import { placesNearRoute } from './supabase';
import { getSavedDay, saveDay } from './currentDay';
import { useGoogleReady } from './useGoogleReady';
import {
  addDay as addDayRow,
  canRoute,
  deleteDay as deleteDayRow,
  ensureShareToken,
  fetchTrip,
  reorderDay,
  revokeShareToken,
  saveDayRoute,
  setDayEndpoints,
  updateTrip as updateTripRow,
  type DayData,
} from './trips';
import type { Endpoint, NearbyHit, Place, Trip } from './types';

export type TripStatus = 'loading' | 'ready' | 'missing' | 'error';

const pathKm = (ps: Place[]) => ps.slice(1).reduce((sum, p, i) => sum + haversineKm(ps[i], p), 0);

export function useTripPlanner(tripId: string, places: Place[], notify: (message: string) => void) {
  const [status, setStatus] = useState<TripStatus>('loading');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [radiusKm, setRadiusKm] = useState(1);
  const [nearbyFilter, setNearbyFilter] = useState<NearbyFilterKey>('all');
  const [routeLoading, setRouteLoading] = useState(false);
  const [roadHits, setRoadHits] = useState<{ id: string; distanceKm: number }[] | null>(null);
  const googleReady = useGoogleReady();

  // เขียน DB ทีละคำสั่งต่อวัน เพื่อไม่ให้ผลเก่าทับลำดับใหม่
  const queues = useRef(new Map<string, Promise<unknown>>());
  const enqueue = useCallback((dayId: string, job: () => Promise<unknown>) => {
    const next = (queues.current.get(dayId) ?? Promise.resolve()).catch(() => {}).then(job);
    queues.current.set(dayId, next);
    return next;
  }, []);
  const failedRoute = useRef('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchTrip(tripId);
      if (!data) return setStatus('missing');
      setTrip(data.trip);
      setDays(data.days);
      // กลับมาที่วันที่เลือกไว้ล่าสุด (ร่วมกับ "+ เพิ่มในวันที่ N" ที่หน้าสถานที่)
      const saved = getSavedDay(data.trip.id);
      setDayIdx(Math.max(0, data.days.findIndex((d) => d.dayNo === saved)));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const placeMap = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const day = days[dayIdx] as DayData | undefined;

  const tripIdNow = trip?.id;
  const dayNoNow = day?.dayNo;
  useEffect(() => {
    if (tripIdNow && dayNoNow) saveDay(tripIdNow, dayNoNow);
  }, [tripIdNow, dayNoNow]);
  const dayKey = day ? day.placeIds.join(',') : '';
  const dayPlaces = useMemo(() => (day ? (day.placeIds.map((id) => placeMap.get(id)).filter(Boolean) as Place[]) : []), [day, placeMap]);
  const placesReady = !!day && dayPlaces.length === day.placeIds.length;
  const inTripIds = useMemo(() => new Set(days.flatMap((d) => d.placeIds)), [days]);
  const inTripKey = [...inTripIds].sort().join(',');

  const start = day?.start ?? null;
  const end = day?.end ?? null;
  const endsKey = `${start ? `${start.lat},${start.lng}` : ''}|${end ? `${end.lat},${end.lng}` : ''}`;
  const routeable = !!day && canRoute(day.placeIds.length, start, end);

  const sched = useMemo(
    () =>
      schedule(dayPlaces, trip?.day_start_min ?? 540, placesReady ? day?.route?.legs : undefined, {
        start,
        end,
        startLeg: placesReady ? day?.route?.startLeg : null,
      }),
    [dayPlaces, trip?.day_start_min, placesReady, day?.route, start, end],
  );

  // ---- เส้นทางตามถนนจริง (cache ใน DB; คำนวณใหม่เมื่อลำดับหรือจุดรับ/ส่งเปลี่ยน) ----
  useEffect(() => {
    if (!day || !googleReady || !placesReady || day.route || !routeable) return;
    const key = `${day.id}:${dayKey}:${endsKey}`;
    if (failedRoute.current === key) return;
    let cancelled = false;
    setRouteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const route = await fetchRoute(routePoints(start, dayPlaces, end), !!start);
        if (cancelled) return;
        setDays((prev) =>
          prev.map((d) => (d.id === day.id && d.placeIds.join(',') === dayKey && `${d.start ? `${d.start.lat},${d.start.lng}` : ''}|${d.end ? `${d.end.lat},${d.end.lng}` : ''}` === endsKey ? { ...d, route } : d)),
        );
        await enqueue(day.id, () => saveDayRoute(day.id, day.placeIds, route));
      } catch {
        failedRoute.current = key; // ใช้ค่าประมาณ ไม่ลองซ้ำจนกว่าลำดับจะเปลี่ยน
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setRouteLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.id, dayKey, endsKey, day?.route, googleReady, placesReady]);

  // ---- สถานที่ใกล้เส้นทาง: RPC (PostGIS) กับเส้นทางจริง; ไม่มีเส้นทางจริง = คำนวณฝั่ง client จากเส้นตรง ----
  const routeGeo = day?.route?.geojson;
  useEffect(() => {
    if (!routeGeo) return setRoadHits(null);
    let cancelled = false;
    placesNearRoute(routeGeo, radiusKm, [...inTripIds])
      .then((rows) => !cancelled && setRoadHits(rows.map((r) => ({ id: r.id, distanceKm: r.distance_m / 1000 }))))
      .catch(() => !cancelled && setRoadHits(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeGeo, radiusKm, inTripKey]);

  // ทุกหมวด (ใช้ "เติมสถานที่แนะนำให้อัตโนมัติ") — hits คือผลที่กรองหมวดแล้วสำหรับแสดง
  const allHits: NearbyHit[] = useMemo(() => {
    if (!placesReady || !routeable) return [];
    const pts = routePoints(start, dayPlaces, end);
    const n = dayPlaces.length;
    if (roadHits) {
      return roadHits.flatMap((h) => {
        const place = placeMap.get(h.id);
        return place ? [placeHit({ place, distanceKm: h.distanceKm, segment: nearestSegment(place, pts) }, n, !!start, !!end)] : [];
      });
    }
    return nearbyAlongRoute(pts, places, radiusKm, inTripIds).map((h) => placeHit(h, n, !!start, !!end));
  }, [roadHits, placesReady, routeable, start, end, dayPlaces, places, placeMap, radiusKm, inTripIds]);

  const hits = useMemo(() => {
    const cats = NEARBY_FILTERS.find((f) => f.key === nearbyFilter)?.cats;
    return cats ? allHits.filter((h) => cats.includes(h.place.category)) : allHits;
  }, [allHits, nearbyFilter]);

  // ---- แก้ไขลำดับ (optimistic แล้วบันทึกทั้งวันด้วย RPC reorder_day) ----
  const setIds = useCallback(
    (idx: number, ids: string[]) => {
      const target = days[idx];
      if (!target) return;
      setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, placeIds: ids, route: null } : d)));
      enqueue(target.id, () => reorderDay(target.id, ids)).catch(() => {
        notify('บันทึกลำดับไม่สำเร็จ กรุณาลองอีกครั้ง');
        load();
      });
    },
    [days, enqueue, notify, load],
  );

  const addPlace = useCallback(
    (place: Place, atIndex?: number) => {
      if (!day) return;
      if (day.placeIds.includes(place.id)) return notify(`${place.name} อยู่ในวันที่ ${day.dayNo} แล้ว`);
      const ids = [...day.placeIds];
      ids.splice(atIndex ?? ids.length, 0, place.id);
      setIds(dayIdx, ids);
      notify(`เพิ่ม ${place.name} ในวันที่ ${day.dayNo}`);
    },
    [day, dayIdx, setIds, notify],
  );

  const removeStop = useCallback(
    (index: number) => {
      if (!day) return;
      setIds(dayIdx, day.placeIds.filter((_, i) => i !== index));
    },
    [day, dayIdx, setIds],
  );

  const moveStop = useCallback(
    (from: number, to: number) => {
      if (!day || from === to || to < 0 || to >= day.placeIds.length) return;
      const ids = [...day.placeIds];
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      setIds(dayIdx, ids);
    },
    [day, dayIdx, setIds],
  );

  const runAutoOrder = useCallback(() => {
    if (!day || dayPlaces.length < 3) return notify('ต้องมีอย่างน้อย 3 จุดจึงจัดลำดับอัตโนมัติได้');
    const ordered = autoOrder(dayPlaces);
    const saved = pathKm(dayPlaces) - pathKm(ordered);
    setIds(dayIdx, ordered.map((p) => p.id));
    notify(saved > 0.05 ? `จัดลำดับแล้ว · ลดระยะทาง (เส้นตรง) ลง ${saved.toFixed(1)} กม.` : 'จัดลำดับแล้ว · ลำดับเดิมดีอยู่แล้ว');
  }, [day, dayPlaces, dayIdx, setIds, notify]);

  // ---- จุดรับ/ส่งลูกค้า (รายวัน) ----
  const setEndpoints = useCallback(
    (which: 'start' | 'end', value: Endpoint | null) => {
      const target = days[dayIdx];
      if (!target) return;
      const next = { start: which === 'start' ? value : target.start, end: which === 'end' ? value : target.end };
      setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, ...next, route: null } : d)));
      enqueue(target.id, () => setDayEndpoints(target.id, next.start, next.end)).catch(() => {
        notify('บันทึกจุดรับ/ส่งไม่สำเร็จ กรุณาลองอีกครั้ง');
        load();
      });
      notify(value ? `ตั้ง${which === 'start' ? 'จุดรับ' : 'จุดส่ง'}: ${value.name}` : `ลบ${which === 'start' ? 'จุดรับ' : 'จุดส่ง'}แล้ว`);
    },
    [days, dayIdx, enqueue, notify, load],
  );

  /** วันที่ยังไม่มีจุดแวะ: เลือกสถานที่ระหว่างจุดรับ-ส่งให้อัตโนมัติ (ท่องเที่ยวใกล้เส้นทางที่สุด + ร้านอาหาร 1 แห่ง) เรียงตามแนวทาง */
  const autoFill = useCallback(() => {
    if (!day || day.placeIds.length > 0 || !routeable) return;
    const eatCats = NEARBY_FILTERS.find((f) => f.key === 'eat')!.cats!;
    const pool = allHits.filter((h) => h.place.category !== 'stay');
    const eat = pool.filter((h) => eatCats.includes(h.place.category)).slice(0, 1);
    const sights = pool.filter((h) => !eatCats.includes(h.place.category)).slice(0, 4);
    const picked = [...sights, ...eat];
    if (!picked.length) return notify('ไม่พบสถานที่ใกล้เส้นทาง ลองขยายรัศมีค้นหา');
    const line: { lat: number; lng: number }[] = day.route ? day.route.line.map(([lat, lng]) => ({ lat, lng })) : routePoints(start, [], end);
    const ordered = picked.map((h) => h.place).sort((a, b) => alongRouteIndex(a, line) - alongRouteIndex(b, line));
    setIds(dayIdx, ordered.map((p) => p.id));
    notify(`เพิ่มสถานที่แนะนำ ${ordered.length} แห่งในวันที่ ${day.dayNo}`);
  }, [day, routeable, allHits, start, end, dayIdx, setIds, notify]);

  // ---- วัน ----
  const addNewDay = useCallback(async () => {
    if (!trip) return;
    try {
      const dayNo = Math.max(0, ...days.map((d) => d.dayNo)) + 1;
      // วันใหม่เริ่มจากจุดส่งของวันก่อนหน้า (เช่น เช้าวันถัดไปรับที่โรงแรมเดิม)
      const startFrom = days.at(-1)?.end ?? null;
      const id = await addDayRow(trip.id, dayNo, startFrom);
      setDays((prev) => [...prev, { id, dayNo, placeIds: [], start: startFrom, end: null, route: null }]);
      setDayIdx(days.length);
    } catch {
      notify('เพิ่มวันไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  }, [trip, days, notify]);

  const removeDay = useCallback(async () => {
    if (!day || days.length < 2) return;
    try {
      await deleteDayRow(day.id);
      setDays((prev) => prev.filter((d) => d.id !== day.id).map((d, i) => ({ ...d, dayNo: i + 1 })));
      setDayIdx((i) => Math.max(0, Math.min(i, days.length - 2)));
      notify(`ลบวันที่ ${day.dayNo} แล้ว`);
    } catch {
      notify('ลบวันไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  }, [day, days.length, notify]);

  // ---- ข้อมูลทริป / ลิงก์ลูกค้า ----
  const updateTrip = useCallback(
    async (patch: Partial<Pick<Trip, 'name' | 'client_name' | 'pax' | 'start_date' | 'day_start_min'>>) => {
      if (!trip) return;
      const before = trip;
      setTrip({ ...trip, ...patch });
      try {
        await updateTripRow(trip.id, patch);
        // เปลี่ยนเวลาเริ่มวันไม่กระทบเส้นทาง แต่ตารางเวลาคำนวณจาก trip.day_start_min โดยตรง
        notify('บันทึกข้อมูลทริปแล้ว');
      } catch {
        setTrip(before);
        notify('บันทึกข้อมูลทริปไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    },
    [trip, notify],
  );

  const shareLink = useCallback(async () => {
    if (!trip) return;
    let url: string;
    try {
      // ลูกค้าเปิดลิงก์โดยไม่มี Google Routes ฝั่งเซิร์ฟเวอร์ → ต้อง cache เส้นทางทุกวันก่อนแชร์ (วันที่คำนวณไม่ได้ใช้ค่าประมาณ)
      if (googleReady) {
        await Promise.all(
          days
            .filter((d) => !d.route && canRoute(d.placeIds.length, d.start, d.end))
            .map((d) =>
              ensureDayRoute(d, placeMap)
                .then((route) => route && setDays((prev) => prev.map((x) => (x.id === d.id && x.placeIds.join(',') === d.placeIds.join(',') ? { ...x, route } : x))))
                .catch(() => {}),
            ),
        );
      }
      const token = await ensureShareToken(trip);
      if (!trip.share_token) setTrip({ ...trip, share_token: token });
      url = `${window.location.origin}/share/${token}`;
    } catch {
      return notify('สร้างลิงก์ลูกค้าไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
    try {
      await navigator.clipboard.writeText(url);
      notify('คัดลอกลิงก์ลูกค้าแล้ว');
    } catch {
      // เบราว์เซอร์บางตัวไม่ให้เขียนคลิปบอร์ด (ไม่มีสิทธิ์/ไม่ใช่ HTTPS) — ให้ผู้ใช้คัดลอกเอง
      window.prompt('คัดลอกลิงก์ลูกค้า', url);
    }
  }, [trip, days, placeMap, googleReady, notify]);

  const revokeShareLink = useCallback(async () => {
    if (!trip?.share_token) return;
    try {
      await revokeShareToken(trip.id);
      setTrip({ ...trip, share_token: null });
      notify('ยกเลิกลิงก์ลูกค้าแล้ว ลิงก์เดิมเปิดไม่ได้อีก');
    } catch {
      notify('ยกเลิกลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  }, [trip, notify]);

  return {
    status,
    reload: load,
    trip,
    days,
    day,
    dayIdx,
    setDayIdx,
    dayPlaces,
    sched,
    inTripIds,
    routeLoading,
    /** true = ระยะ/เวลามาจาก Google Routes ตามถนนจริง, false = ค่าประมาณ */
    isRoad: !!day?.route,
    radiusKm,
    setRadiusKm,
    hits,
    allHitsCount: allHits.length,
    nearbyFilter,
    setNearbyFilter,
    actions: { setEndpoints, autoFill, addPlace, removeStop, moveStop, autoOrder: runAutoOrder, addDay: addNewDay, deleteDay: removeDay, updateTrip, shareLink, revokeShareLink },
  };
}
