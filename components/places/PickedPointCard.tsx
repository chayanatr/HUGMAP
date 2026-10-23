'use client';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { fmtKm, haversineKm } from '@/lib/geo';
import { guessCategoryFromGoogle, type PickedLocation } from '@/lib/placesSearch';

export interface PickedPoint {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  /** กำลังดึงชื่อ/ที่อยู่ของสถานที่ที่กด */
  loading?: boolean;
  /** ชนิดสถานที่ของ Google — ใช้เดาหมวดตอนเพิ่มสถานที่ */
  types?: string[];
  /** แขวง/เมืองจากที่อยู่ของ Google (ถ้ามี) */
  province?: string | null;
  district?: string | null;
}

/** ลิงก์ไปฟอร์มเพิ่มสถานที่พร้อมข้อมูลที่เติมให้ (ชื่อ/ที่อยู่/พิกัด) — ฟอร์มอ่านจาก query string */
export function newPlaceHref(p: PickedLocation | PickedPoint) {
  const q = new URLSearchParams({ lat: p.lat.toFixed(6), lng: p.lng.toFixed(6) });
  if (p.name) q.set('name', p.name);
  if (p.address) q.set('address', p.address);
  const guessed = p.types ? guessCategoryFromGoogle(p.types) : null;
  if (guessed) q.set('cat', guessed);
  if ('province' in p && p.province) {
    q.set('province', p.province);
    if (p.district) q.set('district', p.district);
  }
  return `/places/new?${q}`;
}

/** การ์ดจุดที่เลือกบนแผนที่ (กดแผนที่ / กดสถานที่ของ Google / ผลค้นหา): admin เพิ่มเป็นสถานที่ได้ทันที */
export function PickedPointCard({
  point,
  canAdd,
  nearest,
  onAdd,
  onClose,
}: {
  point: PickedPoint;
  canAdd: boolean;
  /** สถานที่ที่บันทึกไว้ใกล้ที่สุด (กันเพิ่มซ้ำ) */
  nearest?: { name: string; km: number } | null;
  /** กดแล้วเปิดฟอร์มเพิ่มสถานที่ (กรอกรายละเอียดบนหน้านี้) */
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-5 z-[1000] max-md:bottom-[104px] flex flex-col gap-3 rounded-card bg-surface p-3.5 shadow-dropdown md:inset-x-auto md:left-4 md:w-[340px]">
      <div className="flex items-start gap-2">
        <Icon name="location_on" className="mt-0.5 shrink-0 text-[22px] text-brand" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-title">{point.loading ? 'กำลังดึงข้อมูลสถานที่…' : (point.name ?? 'จุดที่เลือกบนแผนที่')}</div>
          {point.address && <div className="text-[12px] leading-[1.5] text-muted">{point.address}</div>}
          <div className="mt-0.5 text-label tabular-nums">
            {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
          </div>
          {nearest && nearest.km <= 0.1 && (
            <div className="mt-1 text-[12px] text-danger-text">ใกล้กับ “{nearest.name}” ที่บันทึกไว้แล้ว ({fmtKm(nearest.km)}) ตรวจก่อนเพิ่มซ้ำ</div>
          )}
        </div>
        <IconButton icon="close" label="ปิด" onClick={onClose} className="!h-11 !w-11 border-0" />
      </div>
      {canAdd ? (
        <Button onClick={onAdd} icon="add_location_alt" className="w-full">
          เพิ่มสถานที่ที่นี่
        </Button>
      ) : (
        <p className="text-[12px] leading-[1.5] text-placeholder">การเพิ่มสถานที่เป็นสิทธิ์ของผู้ดูแลระบบ</p>
      )}
    </div>
  );
}

/** สถานที่ที่บันทึกไว้ใกล้จุดที่สุด */
export function nearestSaved(p: { lat: number; lng: number }, places: { name: string; lat: number; lng: number }[]) {
  let best: { name: string; km: number } | null = null;
  for (const s of places) {
    const km = haversineKm(p, s);
    if (!best || km < best.km) best = { name: s.name, km };
  }
  return best;
}
