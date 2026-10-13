'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSavedDay } from './currentDay';
import { createTrip, fetchLatestTrip, fetchTrip, reorderDay, type DayData } from './trips';
import type { Place, Trip } from './types';

/**
 * ทริปล่าสุด + วันที่เลือกอยู่ สำหรับหน้าสถานที่: ป้าย "ในทริป" และปุ่ม "+ เพิ่มในวันที่ N"
 * ไม่สร้างทริปเองตอนเปิดหน้า — สร้างเฉพาะเมื่อผู้ใช้กดเพิ่มสถานที่ขณะที่ยังไม่มีทริปเลย
 */
export function useCurrentTrip(notify: (message: string) => void) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<DayData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLatestTrip()
      .then((data) => {
        if (cancelled) return;
        setTrip(data?.trip ?? null);
        setDays(data?.days ?? []);
      })
      .catch(() => {}) // โหลดไม่ได้ = ไม่แสดงป้ายและปุ่ม ส่วนอื่นของหน้ายังใช้ได้
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const pickDay = useCallback((t: Trip | null, ds: DayData[]) => {
    const saved = t ? getSavedDay(t.id) : null;
    return ds.find((d) => d.dayNo === saved) ?? ds[0] ?? null;
  }, []);

  const day = useMemo(() => pickDay(trip, days), [trip, days, pickDay]);
  const dayNo = day?.dayNo ?? 1;
  const inTripIds = useMemo(() => new Set(days.flatMap((d) => d.placeIds)), [days]);
  const inCurrentDay = useCallback((placeId: string) => !!day?.placeIds.includes(placeId), [day]);

  /** เพิ่มสถานที่ต่อท้ายวันที่เลือก (ถ้ายังไม่มีทริป สร้างทริปเริ่มต้นก่อน) */
  const addToCurrentDay = useCallback(
    async (place: Place) => {
      if (busy) return;
      setBusy(true);
      try {
        let t = trip;
        let ds = days;
        if (!t) {
          const created = await fetchTrip((await createTrip()).id);
          if (!created) throw new Error('create failed');
          t = created.trip;
          ds = created.days;
          setTrip(t);
        }
        const target = pickDay(t, ds);
        if (!target) throw new Error('no day');
        if (target.placeIds.includes(place.id)) return;
        const ids = [...target.placeIds, place.id];
        await reorderDay(target.id, ids); // RPC ล้าง cache เส้นทางของวันนั้นด้วย
        setDays(ds.map((d) => (d.id === target.id ? { ...d, placeIds: ids, route: null } : d)));
        notify(`เพิ่ม ${place.name} ในวันที่ ${target.dayNo}`);
      } catch {
        notify('เพิ่มสถานที่ไม่สำเร็จ กรุณาลองอีกครั้ง');
      } finally {
        setBusy(false);
      }
    },
    [trip, days, busy, pickDay, notify],
  );

  return { loaded, busy, dayNo, inTripIds, inCurrentDay, addToCurrentDay };
}
