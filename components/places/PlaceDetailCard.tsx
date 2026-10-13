/* eslint-disable @next/next/no-img-element -- รูปจาก Supabase Storage ขนาดเล็ก ไม่ผ่าน image optimizer */
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { DarkCard } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { CAT, CITY_LABEL } from '@/lib/categories';
import { fmtDuration } from '@/lib/geo';
import type { Place } from '@/lib/types';

/** การ์ดลอยเขียวเข้มมุมขวาล่างของแผนที่ (mobile เต็มกว้าง) */
export function PlaceDetailCard({ place, onClose, tripAction }: { place: Place; onClose: () => void; tripAction?: ReactNode }) {
  const c = CAT[place.category];
  const info = [
    place.open_hours ? `เปิด ${place.open_hours}` : 'ไม่ระบุเวลาเปิด',
    place.fee ? `ค่าเข้า ${place.fee}` : '',
    `เวลาแนะนำ ${fmtDuration(place.duration_min)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <DarkCard className="absolute bottom-5 right-4 z-[1000] flex w-[340px] flex-col gap-3 max-md:left-4 max-md:w-auto">
      <div className="flex gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-item bg-dark-field text-[11px] text-dark-muted">
          {place.photos[0] ? <img src={place.photos[0]} alt={place.name} className="h-full w-full object-cover" /> : 'photo'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[12px] text-dark-muted">
            <Icon name={c.icon} className="text-[14px]" />
            {c.label} · {CITY_LABEL[place.city]}
          </div>
          <h2 className="mt-0.5 text-[16px] font-bold leading-snug">{place.name}</h2>
          <div className="text-[12px] tabular-nums text-dark-muted">
            {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดรายละเอียด"
          className="-mr-2 -mt-2 grid h-11 w-11 shrink-0 place-items-center rounded-input text-dark-muted hover:text-white focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>
      <div className="rounded-input bg-dark-field px-3 py-2 text-[12px] leading-[1.6]">{info}</div>
      {place.description && <p className="line-clamp-3 text-[13px] leading-[1.6] text-dark-soft">{place.description}</p>}
      <div className="flex gap-2">
        <Button variant="dark-outline" icon="edit" href={`/places/${place.id}/edit`}>
          แก้ไข
        </Button>
        {tripAction}
      </div>
    </DarkCard>
  );
}
