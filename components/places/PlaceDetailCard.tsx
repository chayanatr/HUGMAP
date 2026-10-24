/* eslint-disable @next/next/no-img-element -- รูปจาก Supabase Storage ขนาดเล็ก ไม่ผ่าน image optimizer */
import { useState, type ReactNode } from 'react';
import { PhotoGallery } from '@/components/places/PhotoGallery';
import { Button } from '@/components/ui/Button';
import { DarkCard } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useCategories } from '@/components/CategoriesProvider';
import { regionText } from '@/lib/provinces';
import { fmtDuration } from '@/lib/geo';
import type { Place } from '@/lib/types';

/** การ์ดลอยเขียวเข้มมุมขวาล่างของแผนที่ (mobile เต็มกว้าง) */
export function PlaceDetailCard({
  place,
  onClose,
  canEdit,
  tripAction,
}: {
  place: Place;
  onClose: () => void;
  canEdit?: boolean;
  tripAction?: ReactNode;
}) {
  const c = useCategories().cat(place.category);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const info = [
    place.open_hours ? `เปิด ${place.open_hours}` : 'ไม่ระบุเวลาเปิด',
    place.fee ? `ค่าเข้า ${place.fee}` : '',
    `เวลาแนะนำ ${fmtDuration(place.duration_min)}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <DarkCard className="absolute bottom-5 right-4 z-[1000] flex w-[340px] flex-col gap-3 max-md:bottom-[104px] max-md:left-4 max-md:w-auto">
      <div className="flex gap-3">
        {place.photos[0] ? (
          <button
            type="button"
            onClick={() => setGalleryOpen(true)}
            aria-label={`ดูรูปทั้งหมดของ ${place.name} (${place.photos.length} รูป)`}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-item bg-dark-field focus-visible:outline-none focus-visible:shadow-focus"
          >
            <img src={place.photos[0]} alt={place.name} className="h-full w-full object-cover" />
            {place.photos.length > 1 && (
              <span className="absolute bottom-0.5 right-0.5 rounded-pill bg-ink/80 px-1.5 text-[11px] font-semibold tabular-nums">+{place.photos.length - 1}</span>
            )}
          </button>
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-item bg-dark-field text-[11px] text-dark-muted">photo</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[12px] text-dark-muted">
            <Icon name={c.icon} className="text-[14px]" />
            {c.label} · {regionText(place)}
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
        {canEdit && (
          <Button variant="dark-outline" icon="edit" href={`/places/${place.id}/edit`}>
            แก้ไข
          </Button>
        )}
        {tripAction}
      </div>
      {place.photos.length > 0 && <PhotoGallery photos={place.photos} name={place.name} open={galleryOpen} onClose={() => setGalleryOpen(false)} />}
    </DarkCard>
  );
}
