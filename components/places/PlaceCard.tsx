'use client';
import { Card, LabelValue } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';
import { CAT, CITY_LABEL } from '@/lib/categories';
import { fmtDuration } from '@/lib/geo';
import type { Place } from '@/lib/types';

export function CategoryTile({ category, size = 44, iconPx = 22 }: { category: Place['category']; size?: number; iconPx?: number }) {
  const c = CAT[category];
  return (
    <div className="grid shrink-0 place-items-center rounded-item" style={{ width: size, height: size, background: c.soft, color: c.color, fontSize: iconPx }}>
      <Icon name={c.icon} />
    </div>
  );
}

/** การ์ดสถานที่ในรายการ — กดเพื่อเลือก (ring เขียวเมื่อเลือก) */
export function PlaceCard({ place, selected, inTrip, onSelect }: { place: Place; selected: boolean; inTrip?: boolean; onSelect: (id: string) => void }) {
  const c = CAT[place.category];
  return (
    <Card
      id={`place-${place.id}`}
      selected={selected}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(place.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(place.id);
        }
      }}
      className="cursor-pointer overflow-hidden outline-none transition-shadow focus-visible:shadow-focus"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-label">
            {c.label} · {CITY_LABEL[place.city]}
          </div>
          <div className="mt-0.5 truncate text-title">{place.name}</div>
        </div>
        <CategoryTile category={place.category} />
      </div>
      <div className="grid grid-cols-3 gap-2.5 border-t border-line px-4 pb-3 pt-2.5">
        <LabelValue label="เวลาเปิด">{place.open_hours ?? '—'}</LabelValue>
        <LabelValue label="ค่าเข้า">{place.fee ?? '—'}</LabelValue>
        <LabelValue label="เวลาแนะนำ">
          {fmtDuration(place.duration_min)} {inTrip && <Pill small>ในทริป</Pill>}
        </LabelValue>
      </div>
    </Card>
  );
}
