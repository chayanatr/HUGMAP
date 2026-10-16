'use client';
import Image from 'next/image';
import { useMemo } from 'react';
import { CategoryTile } from '@/components/places/PlaceCard';
import { LazyMap } from '@/components/summary/LazyMap';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { fmtKm, fmtDuration } from '@/lib/geo';
import { buildItinerary, itemTime, itineraryText, type ItineraryDay, type ItineraryItem } from '@/lib/itinerary';
import { summarize, type DayView, type SummaryData } from '@/lib/summary';
import type { NearbyHit } from '@/lib/types';

const card = 'rounded-section bg-surface shadow-card print:shadow-none print:ring-1 print:ring-line-border';
const linkBtn =
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-input bg-brand-soft px-3 text-[13px] font-semibold text-brand-hover hover:bg-brand-ring focus-visible:outline-none focus-visible:shadow-focus md:min-h-9 print:bg-transparent print:px-0';

/**
 * สรุปเส้นทาง / ตารางเดินทาง — ใช้ร่วมกันระหว่างพนักงาน (/trips/[id]/summary) และลูกค้า (/share/[token])
 * mode="client" = เอกสารอ่านอย่างเดียวสำหรับลูกค้า/ทีมรถตู้ (โลโก้ HUGLAO, ตารางเวลา, ลิงก์ Google Maps; ไม่โหลดแผนที่)
 * mode="staff" = เพิ่มปุ่มแก้ไข/ลิงก์ลูกค้า แผนที่ และสถานที่แนะนำใกล้เส้นทาง
 */
export function SummaryView({
  data,
  mode,
  routing,
  onCopyLink,
  onRevokeLink,
  onAddNearby,
}: {
  data: SummaryData;
  mode: 'staff' | 'client';
  routing?: boolean;
  onCopyLink?: () => void;
  /** แสดงปุ่ม "ยกเลิกลิงก์" เมื่อทริปมีลิงก์ลูกค้าเปิดอยู่ (staff เท่านั้น) */
  onRevokeLink?: () => void;
  onAddNearby?: (dayId: string, hit: NearbyHit, atIndex: number) => void;
}) {
  const toast = useToast();
  const s = useMemo(() => summarize(data), [data]);
  const it = useMemo(() => buildItinerary(data), [data]);
  const { trip } = data;
  const staff = mode === 'staff';
  const stats = [
    { label: 'จำนวนวัน', value: `${s.totals.days} วัน` },
    { label: 'จุดแวะ', value: `${s.totals.stops} จุด` },
    { label: 'ระยะทางรวม', value: fmtKm(s.totals.km) },
    { label: 'เวลาเดินทางรวม', value: fmtDuration(s.totals.travelMin) },
  ];

  async function copyText() {
    const text = itineraryText(data);
    try {
      await navigator.clipboard.writeText(text);
      toast('คัดลอกตารางเดินทางแล้ว วางส่ง LINE ได้เลย');
    } catch {
      window.prompt('คัดลอกตารางเดินทาง', text);
    }
  }

  return (
    <div className={cn('mx-auto flex flex-col gap-5 p-4 md:p-7 print:max-w-none print:p-0', staff ? 'max-w-[1120px]' : 'max-w-[820px]')}>
      <header className={cn(card, 'flex flex-col gap-4 p-4 md:p-6')}>
        <div className="flex flex-wrap items-center gap-2.5">
          {staff ? (
            <>
              <Image src="/brand/huglao-emblem.png" alt="HUGLAO" width={40} height={40} unoptimized className="h-10 w-10" />
              <span className="rounded-[8px] bg-brand-soft px-2.5 py-1 text-[12px] font-semibold tabular-nums text-brand-hover">{trip.code}</span>
              <span className="text-[13px] text-placeholder">
                <b className="font-bold tracking-[.04em] text-brand-hover">HUGMAP</b> · สรุปเส้นทาง
              </span>
            </>
          ) : (
            <Image src="/brand/huglao-logo.png" alt="HUGLAO" width={560} height={528} priority unoptimized className="h-16 w-auto md:h-[72px]" />
          )}
          <div className="no-print ml-auto flex flex-wrap gap-2">
            {staff && (
              <>
                <Button variant="outline" icon="edit" href={`/trips/${trip.id}`} className="md:!h-10 !text-[13px]">
                  แก้ไข
                </Button>
                <Button variant="outline" icon="link" onClick={onCopyLink} className="md:!h-10 !text-[13px]">
                  คัดลอกลิงก์ลูกค้า
                </Button>
                {trip.share_token && onRevokeLink && (
                  <Button variant="outline" icon="link_off" onClick={onRevokeLink} className="md:!h-10 !text-[13px] !text-danger-text">
                    ยกเลิกลิงก์
                  </Button>
                )}
              </>
            )}
            <Button variant="outline" icon="content_copy" onClick={copyText} className="md:!h-10 !text-[13px]">
              คัดลอกข้อความส่ง LINE
            </Button>
            <Button icon="picture_as_pdf" onClick={() => window.print()} className="md:!h-10 !px-3.5 !text-[13px]">
              พิมพ์ / PDF
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-[26px] font-bold leading-[1.3] tracking-[-0.01em] md:text-[32px]">
            <span className="text-brand-hover">HUGLAO</span> <span className="font-normal text-line-dash">|</span> {trip.name}
          </h1>
          {trip.subtitle && <p className="mt-1.5 text-[15px] font-medium text-ink">{trip.subtitle}</p>}
          {trip.lodging_note && (
            <p className="mt-1 flex items-center gap-1.5 text-[14px] text-muted">
              <Icon name="hotel" className="text-[18px] text-brand" />
              {trip.lodging_note}
            </p>
          )}
          <p className="mt-1 text-[14px] text-muted">
            {trip.client_name} · {trip.pax} ท่าน · {it.range}
          </p>
        </div>

        {staff && (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line md:grid-cols-4">
            {stats.map((t) => (
              <div key={t.label} className="bg-surface px-4 py-3">
                <dt className="text-label">{t.label}</dt>
                <dd className="mt-0.5 text-[22px] font-bold tabular-nums">{t.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {staff && routing && <p className="no-print text-[12px] text-muted">กำลังคำนวณเส้นทางตามถนนจริง…</p>}
      </header>

      {s.days.map((d, i) => (
        <DaySection key={d.id} day={d} itDay={it.days[i]} radiusKm={data.radiusKm} staff={staff} onAdd={onAddNearby} />
      ))}

      {trip.footer_note && (
        <section className={cn(card, 'p-4 md:p-6')}>
          <h2 className="text-[15px] font-bold">หมายเหตุ</h2>
          <p className="mt-1.5 whitespace-pre-line text-[14px] leading-[1.7] text-muted">{trip.footer_note}</p>
        </section>
      )}

      <p className="text-[12px] leading-[1.6] text-placeholder">เวลาเดินทางเป็นค่าประมาณ อาจเปลี่ยนตามสภาพถนนและการจราจร{staff ? ' · แผนที่ © Google' : ''}</p>
    </div>
  );
}

/** ตารางเวลาของวัน: เวลา | จุด/คำอธิบาย/ลิงก์ Google Maps (ช่วงเดินทางและช่วงพักแสดงเป็นแถวจาง) */
function Timeline({ items }: { items: ItineraryItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const muted = it.kind === 'travel' || it.kind === 'break';
        return (
          <li key={i} className="grid grid-cols-[78px_16px_minmax(0,1fr)] gap-x-2.5 md:grid-cols-[132px_18px_minmax(0,1fr)] md:gap-x-3 [break-inside:avoid]">
            <div className={cn('pt-0.5 text-right text-[13px] leading-[1.5] tabular-nums', muted ? 'text-placeholder' : 'font-semibold text-ink')}>{itemTime(it)}</div>
            <div className="flex flex-col items-center">
              <Dot kind={it.kind} />
              {!last && <span className="min-h-3 flex-1 border-l-[1.5px] border-dashed border-line-dash" />}
            </div>
            <div className="min-w-0 pb-4">
              {it.kind === 'travel' ? (
                <div className="flex items-center gap-1 text-[13px] leading-[1.5] text-muted">
                  <Icon name="directions_car" className="shrink-0 text-[16px] text-brand" />
                  <span>
                    {it.title}
                    {it.km ? ` · ${fmtKm(it.km)}` : ''}
                  </span>
                </div>
              ) : it.kind === 'break' ? (
                <div className="flex items-center gap-1 text-[14px] font-medium leading-[1.5]">
                  <Icon name="restaurant" className="shrink-0 text-[17px] text-brand" />
                  {it.title}
                </div>
              ) : (
                <>
                  <div className="text-title">
                    {it.kind === 'start' && <span className="mr-1.5 rounded-pill bg-brand-soft px-1.5 py-0.5 align-middle text-[11px] font-semibold text-brand-hover">จุดรับ</span>}
                    {it.kind === 'end' && <span className="mr-1.5 rounded-pill bg-brand-soft px-1.5 py-0.5 align-middle text-[11px] font-semibold text-brand-hover">จุดส่ง</span>}
                    {it.title}
                  </div>
                  {it.note && <p className="mt-0.5 whitespace-pre-line text-[13px] leading-[1.65] text-muted">{it.note}</p>}
                  {it.info.length > 0 && <p className="mt-0.5 text-label">{it.info.join(' · ')}</p>}
                  {it.link && (
                    <a href={it.link} target="_blank" rel="noopener noreferrer" className={cn(linkBtn, 'mt-2')}>
                      <Icon name="location_on" className="text-[18px] print:hidden" />
                      <span>เปิดใน Google Maps</span>
                      <span className="hidden break-all text-[11px] font-normal print:inline">: {it.link}</span>
                    </a>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Dot({ kind }: { kind: ItineraryItem['kind'] }) {
  if (kind === 'start') return <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-brand-mint bg-brand" />;
  if (kind === 'end') return <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-[4px] bg-ink" />;
  if (kind === 'stop') return <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-[4px] border-2 border-ink bg-surface" />;
  return <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-line-dash" />;
}

function DaySection({
  day,
  itDay,
  radiusKm,
  staff,
  onAdd,
}: {
  day: DayView;
  itDay: ItineraryDay;
  radiusKm: number;
  staff: boolean;
  onAdd?: (dayId: string, hit: NearbyHit, atIndex: number) => void;
}) {
  const stopPts = useMemo(() => day.places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, name: p.name, category: p.category })), [day.places]);
  const nearbyPts = useMemo(() => day.nearby.map((h) => ({ id: h.place.id, lat: h.place.lat, lng: h.place.lng, name: h.place.name, category: h.place.category })), [day.nearby]);
  const radiusLabel = radiusKm < 1 ? `${radiusKm * 1000} ม.` : `${radiusKm} กม.`;
  const empty = itDay.items.length === 0;

  return (
    <section className={cn(card, 'flex flex-col gap-4 p-4 [break-inside:avoid-page] md:p-6')}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-8 items-center rounded-[9px] bg-brand px-3 text-[14px] font-semibold text-white">วันที่ {itDay.dayNo}</span>
        <h2 className="min-w-0 text-[18px] font-bold leading-[1.35]">{itDay.title || itDay.dateLabel}</h2>
        {itDay.title && <span className="text-[13px] text-muted">{itDay.dateLabel}</span>}
        <span className="text-[13px] text-muted md:ml-auto">
          {day.stops.length} จุดแวะ · {fmtKm(day.km)} · เดินทาง {fmtDuration(day.travelMin)}
        </span>
      </div>

      {empty ? (
        <p className="rounded-item bg-panel px-4 py-3 text-[14px] text-muted">ยังไม่มีรายการในวันนี้</p>
      ) : staff ? (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="relative h-[260px] overflow-hidden rounded-[14px] bg-map md:h-[380px]">
            <LazyMap stops={stopPts} nearby={nearbyPts} routeLine={day.line} start={day.start} end={day.end} fitKey={day.id} />
          </div>
          <Timeline items={itDay.items} />
        </div>
      ) : (
        <Timeline items={itDay.items} />
      )}

      {itDay.route && (
        <div className="flex flex-col gap-1 border-t border-line pt-3.5">
          <a href={itDay.route.url} target="_blank" rel="noopener noreferrer" className={cn(linkBtn, 'self-start')}>
            <Icon name="route" className="text-[18px] print:hidden" />
            <span>เปิดเส้นทางทั้งวันใน Google Maps (สำหรับคนขับ)</span>
          </a>
          {itDay.route.truncated && <p className="text-[12px] text-muted">ลิงก์รองรับจุดแวะระหว่างทางสูงสุด 9 จุด แสดงเฉพาะ 9 จุดแรกของวัน</p>}
        </div>
      )}

      {staff && day.nearby.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-line pt-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold">แนะนำใกล้เส้นทาง</h2>
            <span className="rounded-pill bg-success-soft px-2 py-0.5 text-[12px] text-success">รัศมี {radiusLabel}</span>
          </div>
          <ul className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {day.nearby.slice(0, 12).map((h) => (
              <li key={h.place.id} className="flex items-center gap-2.5 rounded-item bg-panel p-2 [break-inside:avoid]">
                <CategoryTile category={h.place.category} size={40} iconPx={20} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{h.place.name}</div>
                  <div className="text-label">
                    ห่าง {fmtKm(h.distanceKm)} · {h.between ?? `ช่วงจุด ${h.segment + 1}–${h.segment + 2}`}
                  </div>
                </div>
                {onAdd && (
                  <button
                    type="button"
                    onClick={() => onAdd(day.id, h, h.segment + 1)}
                    aria-label={`เพิ่ม ${h.place.name} ในวันที่ ${day.dayNo}`}
                    title="เพิ่มในวันนี้"
                    className="no-print grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-brand-soft text-brand-hover focus-visible:outline-none focus-visible:shadow-focus md:h-[34px] md:w-[34px]"
                  >
                    <Icon name="add" className="text-[19px]" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
