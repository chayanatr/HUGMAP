'use client';
import Link from 'next/link';
import { CategoryTile } from '@/components/places/PlaceCard';
import { Button } from '@/components/ui/Button';
import { Card, DarkCard } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';
import { useCategories } from '@/components/CategoriesProvider';
import { NEARBY_FILTERS, RADIUS_OPTIONS_KM, hasUngrouped, type NearbyFilterKey } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { useCollapsed } from '@/lib/useCollapsed';
import { fmtDuration, fmtKm } from '@/lib/geo';
import type { Endpoint, ScheduledStop, NearbyHit } from '@/lib/types';

const radiusLabel = (km: number) => (km < 1 ? `${km * 1000} ม.` : `${km} กม.`);
const segmentLabel = (h: NearbyHit) => h.between ?? `ช่วงจุด ${h.segment + 1}–${h.segment + 2}`;

/** ตัวกรองหมวดของรายการแนะนำ (ร้านอาหาร/ท่องเที่ยว/ตลาด) */
export function CategoryFilter({ value, onChange, className }: { value: NearbyFilterKey; onChange: (k: NearbyFilterKey) => void; className?: string }) {
  const { list } = useCategories();
  // ชิป "อื่น ๆ" แสดงเมื่อมีหมวดที่ผู้ดูแลเพิ่มเอง (นอกกลุ่มมาตรฐาน)
  const showOther = hasUngrouped(list.map((c) => c.key));
  return (
    <div role="group" aria-label="กรองหมวด" className={cn('flex gap-1.5 overflow-x-auto', className)}>
      {NEARBY_FILTERS.filter((f) => f.key !== 'other' || showOther).map((f) => (
        <button
          key={f.key}
          type="button"
          aria-pressed={f.key === value}
          onClick={() => onChange(f.key)}
          className={cn(
            'inline-flex h-11 shrink-0 items-center gap-1 rounded-input px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:shadow-focus md:h-8',
            f.key === value ? 'bg-brand text-white' : 'bg-surface text-ink shadow-overlay hover:bg-bg',
          )}
        >
          <Icon name={f.icon} className="text-[16px]" />
          {f.label}
        </button>
      ))}
    </div>
  );
}

export function RadiusTabs({ value, onChange, className }: { value: number; onChange: (km: number) => void; className?: string }) {
  return (
    <div role="group" aria-label="รัศมีค้นหา" className={cn('inline-flex rounded-input bg-surface p-1 shadow-overlay', className)}>
      {RADIUS_OPTIONS_KM.map((km) => (
        <button
          key={km}
          type="button"
          aria-pressed={km === value}
          onClick={() => onChange(km)}
          className={cn(
            'h-11 rounded-[8px] px-3 text-[13px] font-medium tabular-nums focus-visible:outline-none focus-visible:shadow-focus md:h-8',
            km === value ? 'bg-brand text-white' : 'text-ink hover:bg-bg',
          )}
        >
          {radiusLabel(km)}
        </button>
      ))}
    </div>
  );
}

/** แถบลอยล่างแผนที่ (tablet/desktop): หัวข้อ + รัศมี + การ์ดแนวนอน */
export function NearbyBar({
  dayNo,
  hits,
  radiusKm,
  onRadius,
  filter,
  onFilter,
  onAdd,
}: {
  dayNo: number;
  hits: NearbyHit[];
  radiusKm: number;
  onRadius: (km: number) => void;
  filter: NearbyFilterKey;
  onFilter: (k: NearbyFilterKey) => void;
  onAdd: (h: NearbyHit) => void;
}) {
  const { cat } = useCategories();
  const [collapsed, toggle] = useCollapsed('nearbybar');
  return (
    <div className="pointer-events-none absolute bottom-5 left-4 right-4 z-[1000] flex flex-col gap-2.5 max-md:hidden lg:right-[308px]">
      <div className="pointer-events-auto flex flex-wrap items-center gap-3">
        <h2 className="rounded-input bg-surface/90 px-2.5 py-1 text-h2 shadow-overlay">
          ใกล้เส้นทาง · วันที่ {dayNo}
          {collapsed && <span className="ml-2 text-[13px] font-medium text-muted">{hits.length} แห่ง</span>}
        </h2>
        {!collapsed && (
          <>
            <RadiusTabs value={radiusKm} onChange={onRadius} />
            <CategoryFilter value={filter} onChange={onFilter} />
          </>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'แสดงรายการแนะนำ' : 'ซ่อนรายการแนะนำ'}
          title={collapsed ? 'แสดงรายการแนะนำ' : 'ซ่อนรายการแนะนำ'}
          className="grid h-8 w-8 place-items-center rounded-input bg-surface text-muted shadow-overlay hover:text-ink focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name={collapsed ? 'expand_less' : 'expand_more'} className="text-[20px]" />
        </button>
      </div>
      <div className={cn('pointer-events-auto flex gap-2.5 overflow-x-auto pb-1', collapsed && 'hidden')}>
        {hits.length === 0 && <Card className="px-4 py-3 text-[13px] text-muted shadow-overlay">ไม่พบสถานที่ในรัศมี {radiusLabel(radiusKm)} ลองขยายรัศมี</Card>}
        {hits.map((h) => (
          <Card key={h.place.id} className="flex w-[250px] shrink-0 gap-2.5 p-2.5 shadow-overlay">
            <CategoryTile category={h.place.category} size={60} iconPx={26} />
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold">{h.place.name}</div>
                <div className="truncate text-label">
                  {cat(h.place.category).label} · {segmentLabel(h)}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Pill small>ห่าง {fmtKm(h.distanceKm)}</Pill>
                <Button variant="soft" className="!h-7 !px-2.5 !text-[12px]" onClick={() => onAdd(h)}>
                  + เพิ่ม
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** การ์ด "แนะนำใกล้เส้นทาง" ท้าย panel บน mobile (บน tablet/desktop ใช้แถบลอยบนแผนที่แทน) */
export function NearbyPanelCard({
  dayNo,
  hits,
  radiusKm,
  onRadius,
  filter,
  onFilter,
  onAdd,
}: {
  dayNo: number;
  hits: NearbyHit[];
  radiusKm: number;
  onRadius: (km: number) => void;
  filter: NearbyFilterKey;
  onFilter: (k: NearbyFilterKey) => void;
  onAdd: (h: NearbyHit) => void;
}) {
  const { cat } = useCategories();
  return (
    <Card className="flex flex-col gap-3 p-4 md:hidden">
      <h2 className="text-[16px] font-bold">แนะนำใกล้เส้นทาง · วันที่ {dayNo}</h2>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <RadiusTabs value={radiusKm} onChange={onRadius} className="shadow-none ring-1 ring-line-border" />
      </div>
      <CategoryFilter value={filter} onChange={onFilter} className="-mx-1 px-1 pb-1 [&>button]:shadow-none [&>button:not([aria-pressed=true])]:ring-1 [&>button:not([aria-pressed=true])]:ring-line-border" />
      {hits.length === 0 && <p className="text-[13px] leading-[1.6] text-muted">ไม่พบสถานที่ในรัศมี {radiusLabel(radiusKm)} ลองขยายรัศมี</p>}
      <ul className="flex flex-col gap-2">
        {hits.slice(0, 8).map((h) => (
          <li key={h.place.id} className="flex items-center gap-3 rounded-item bg-panel p-2.5">
            <CategoryTile category={h.place.category} size={44} iconPx={22} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold">{h.place.name}</div>
              <div className="truncate text-label">
                {cat(h.place.category).label} · {segmentLabel(h)} · ห่าง {fmtKm(h.distanceKm)}
              </div>
            </div>
            <Button variant="soft" onClick={() => onAdd(h)}>
              + เพิ่ม
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** การ์ดสรุปวันสีเขียวเข้มมุมขวาล่างของแผนที่ (desktop เท่านั้น) */
export function DesktopRouteCard({
  dayNo,
  stops,
  travelMin,
  km,
  summaryHref,
  start,
  end,
}: {
  dayNo: number;
  stops: ScheduledStop[];
  travelMin: number;
  km: number;
  summaryHref: string;
  start?: Endpoint | null;
  end?: Endpoint | null;
}) {
  const first = start ?? stops[0]?.place;
  const last = end ?? (stops.length > 1 ? stops[stops.length - 1].place : null);
  const [collapsed, toggle] = useCollapsed('routecard');
  if (collapsed)
    return (
      <button
        type="button"
        onClick={toggle}
        aria-expanded={false}
        aria-label="แสดงสรุปเส้นทางของวัน"
        className="absolute bottom-5 right-4 z-[1000] flex items-center gap-2 rounded-card bg-dark px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-dark focus-visible:outline-none focus-visible:shadow-focus max-lg:hidden"
      >
        <Icon name="route" className="text-[18px] text-brand-mint" />
        วันที่ {dayNo} · {fmtDuration(travelMin)} ({fmtKm(km)})
        <Icon name="expand_less" className="text-[18px]" />
      </button>
    );
  return (
    <DarkCard className="absolute bottom-5 right-4 z-[1000] flex w-[280px] flex-col gap-3 max-lg:hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded
        aria-label="ย่อสรุปเส้นทางของวัน"
        title="ย่อ"
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-input text-dark-muted hover:text-white focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon name="expand_more" className="text-[20px]" />
      </button>
      <div className="flex items-center gap-3">
        <div className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-input bg-brand">
          <Icon name="route" className="text-[26px]" />
        </div>
        <div>
          <div className="text-[12px] text-dark-muted">
            วันที่ {dayNo} · {stops.length} จุด
          </div>
          <div className="text-[18px] font-bold leading-snug">
            {fmtDuration(travelMin)} <span className="text-[14px] font-medium">({fmtKm(km)})</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[18px_1fr] items-center gap-x-2.5 gap-y-1.5">
        <span className="h-3.5 w-3.5 justify-self-center rounded-full border-[3px] border-brand-mint bg-brand" />
        <div className="truncate rounded-[8px] bg-dark-field px-2.5 py-[7px] text-[12px]">{first?.name ?? '—'}</div>
        <Icon name="location_on" className="justify-self-center text-[16px] text-dark-muted" />
        <div className="truncate rounded-[8px] bg-dark-field px-2.5 py-[7px] text-[12px]">{last?.name ?? '—'}</div>
      </div>
      <Link
        href={summaryHref}
        className="flex h-11 items-center justify-center rounded-input bg-surface text-[14px] font-semibold text-brand-deep hover:bg-brand-soft focus-visible:outline-none focus-visible:shadow-focus"
      >
        ดูสรุปเส้นทาง
      </Link>
    </DarkCard>
  );
}
