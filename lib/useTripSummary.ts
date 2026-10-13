'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ensureDayRoute, roadHitsFor } from './dayRoutes';
import { buildSummaryData, type RoadHits } from './summary';
import { ensureShareToken, fetchTrip, reorderDay, revokeShareToken, type DayData } from './trips';
import type { Place, Trip } from './types';
import { useGoogleReady } from './useGoogleReady';

export type SummaryStatus = 'loading' | 'ready' | 'missing' | 'error';

/** ข้อมูลหน้าสรุปฝั่งพนักงาน: โหลดทริป, คำนวณ/cache เส้นทางของทุกวัน, หาสถานที่ใกล้เส้นทาง */
export function useTripSummary(tripId: string, places: Place[], placesReady: boolean, radiusKm: number, notify: (m: string) => void) {
  const [status, setStatus] = useState<SummaryStatus>('loading');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [roadHits, setRoadHits] = useState<RoadHits>({});
  const [routing, setRouting] = useState(false);
  const googleReady = useGoogleReady();
  const inflight = useRef(new Set<string>());
  const failed = useRef(new Set<string>());

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchTrip(tripId);
      if (!data) return setStatus('missing');
      setTrip(data.trip);
      setDays(data.days);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  const placeMap = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  // คำนวณเส้นทางของวันที่ยังไม่มี cache (วันที่ไม่เคยเปิดในหน้าจัดเส้นทาง)
  useEffect(() => {
    if (!googleReady || !placesReady) return;
    const todo = days.filter((d) => !d.route && d.placeIds.length > 1);
    todo.forEach(async (d) => {
      const key = `${d.id}:${d.placeIds.join(',')}`;
      if (inflight.current.has(key) || failed.current.has(key)) return;
      inflight.current.add(key);
      setRouting(true);
      try {
        const route = await ensureDayRoute(d, placeMap);
        if (route) setDays((prev) => prev.map((x) => (x.id === d.id && x.placeIds.join(',') === d.placeIds.join(',') ? { ...x, route } : x)));
      } catch {
        failed.current.add(key); // ใช้ค่าประมาณ ไม่ลองซ้ำจนกว่าลำดับจะเปลี่ยน
      } finally {
        inflight.current.delete(key);
        if (inflight.current.size === 0) setRouting(false);
      }
    });
  }, [days, googleReady, placesReady, placeMap]);

  // สถานที่ใกล้เส้นทางจริง (RPC) ของแต่ละวันที่มีเส้นทาง
  const routeKey = days.map((d) => `${d.id}:${d.route ? d.placeIds.join(',') : ''}`).join('|');
  useEffect(() => {
    let cancelled = false;
    const exclude = days.flatMap((d) => d.placeIds);
    Promise.all(days.map(async (d) => [d.id, await roadHitsFor(d, radiusKm, exclude).catch(() => undefined)] as const)).then((rows) => {
      if (!cancelled) setRoadHits(Object.fromEntries(rows));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, radiusKm]);

  const data = useMemo(
    () => (trip && placesReady ? buildSummaryData({ tripData: { trip, days }, places, radiusKm, roadHits }) : null),
    [trip, days, places, placesReady, radiusKm, roadHits],
  );

  /** เพิ่มสถานที่แนะนำเข้าวันนั้น (แทรกหลังจุดที่ใกล้ที่สุด) */
  const addToDay = useCallback(
    async (dayId: string, place: Place, atIndex: number) => {
      const day = days.find((d) => d.id === dayId);
      if (!day || day.placeIds.includes(place.id)) return;
      const ids = [...day.placeIds];
      ids.splice(atIndex, 0, place.id);
      try {
        await reorderDay(dayId, ids); // RPC ล้าง cache เส้นทางของวันนั้น
        setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, placeIds: ids, route: null } : d)));
        notify(`เพิ่ม ${place.name} ในวันที่ ${day.dayNo}`);
      } catch {
        notify('เพิ่มสถานที่ไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    },
    [days, notify],
  );

  const copyShareLink = useCallback(async () => {
    if (!trip) return;
    let url: string;
    try {
      // หน้านี้คำนวณ + cache เส้นทางของทุกวันตอนโหลดอยู่แล้ว ลูกค้าจึงเห็นเส้นทางตามถนนจริง
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
      window.prompt('คัดลอกลิงก์ลูกค้า', url);
    }
  }, [trip, notify]);

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

  return { status, reload: load, trip, data, routing, actions: { addToDay, copyShareLink, revokeShareLink } };
}
