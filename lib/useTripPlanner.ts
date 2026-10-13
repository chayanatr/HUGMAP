'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { autoOrder, haversineKm, nearbyAlongRoute, nearestSegment, schedule } from './geo';
import { ensureDayRoute } from './dayRoutes';
import { fetchRoute } from './routes';
import { placesNearRoute } from './supabase';
import { useGoogleReady } from './useGoogleReady';
import {
  addDay as addDayRow,
  deleteDay as deleteDayRow,
  ensureShareToken,
  fetchTrip,
  reorderDay,
  saveDayRoute,
  updateTrip as updateTripRow,
  type DayData,
} from './trips';
import type { NearbyHit, Place, Trip } from './types';

export type TripStatus = 'loading' | 'ready' | 'missing' | 'error';

const pathKm = (ps: Place[]) => ps.slice(1).reduce((sum, p, i) => sum + haversineKm(ps[i], p), 0);

export function useTripPlanner(tripId: string, places: Place[], notify: (message: string) => void) {
  const [status, setStatus] = useState<TripStatus>('loading');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [radiusKm, setRadiusKm] = useState(1);
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
      setDayIdx(0);
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
  const dayKey = day ? day.placeIds.join(',') : '';
  const dayPlaces = useMemo(() => (day ? (day.placeIds.map((id) => placeMap.get(id)).filter(Boolean) as Place[]) : []), [day, placeMap]);
  const placesReady = !!day && dayPlaces.length === day.placeIds.length;
  const inTripIds = useMemo(() => new Set(days.flatMap((d) => d.placeIds)), [days]);
  const inTripKey = [...inTripIds].sort().join(',');

  const sched = useMemo(
    () => schedule(dayPlaces, trip?.day_start_min ?? 540, placesReady ? day?.route?.legs : undefined),
    [dayPlaces, trip?.day_start_min, placesReady, day?.route],
  );

  // ---- เส้นทางตามถนนจริง (cache ใน DB; คำนวณใหม่เมื่อลำดับเปลี่ยน) ----
  useEffect(() => {
    if (!day || !googleReady || !placesReady || day.route || day.placeIds.length < 2) return;
    const key = `${day.id}:${dayKey}`;
    if (failedRoute.current === key) return;
    let cancelled = false;
    setRouteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const route = await fetchRoute(dayPlaces);
        if (cancelled) return;
        setDays((prev) => prev.map((d) => (d.id === day.id && d.placeIds.join(',') === dayKey ? { ...d, route } : d)));
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
  }, [day?.id, dayKey, day?.route, googleReady, placesReady]);

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

  const hits: NearbyHit[] = useMemo(() => {
    if (!placesReady || !dayPlaces.length) return [];
    if (roadHits) {
      return roadHits.flatMap((h) => {
        const place = placeMap.get(h.id);
        return place ? [{ place, distanceKm: h.distanceKm, segment: nearestSegment(place, dayPlaces) }] : [];
      });
    }
    return nearbyAlongRoute(dayPlaces, places, radiusKm, inTripIds);
  }, [roadHits, placesReady, dayPlaces, places, placeMap, radiusKm, inTripIds]);

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

  // ---- วัน ----
  const addNewDay = useCallback(async () => {
    if (!trip) return;
    try {
      const dayNo = Math.max(0, ...days.map((d) => d.dayNo)) + 1;
      const id = await addDayRow(trip.id, dayNo);
      setDays((prev) => [...prev, { id, dayNo, placeIds: [], route: null }]);
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
            .filter((d) => !d.route && d.placeIds.length > 1)
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
    actions: { addPlace, removeStop, moveStop, autoOrder: runAutoOrder, addDay: addNewDay, deleteDay: removeDay, updateTrip, shareLink },
  };
}
