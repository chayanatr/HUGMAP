'use client';
import Image from 'next/image';
import { useMemo } from 'react';
import { CategoryTile } from '@/components/places/PlaceCard';
import { LazyMap } from '@/components/summary/LazyMap';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CAT } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { fmtThaiDate } from '@/lib/format';
import { fmtClock, fmtDuration, fmtKm } from '@/lib/geo';
import { summarize, type DayView, type SummaryData } from '@/lib/summary';
import type { NearbyHit } from '@/lib/types';

const card = 'rounded-section bg-surface shadow-card print:shadow-none print:ring-1 print:ring-line-border';

/**
 * หน้าสรุปเส้นทาง — ใช้ร่วมกันระหว่างพนักงาน (/trips/[id]/summary) และลูกค้า (/share/[token])
 * mode="client" = อ่านอย่างเดียว ไม่มีปุ่มแก้ไข/คัดลอกลิงก์/เพิ่มสถานที่
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
  const s = useMemo(() => summarize(data), [data]);
  const { trip } = data;
  const staff = mode === 'staff';
  const stats = [
    { label: 'จำนวนวัน', value: `${s.totals.days} วัน` },
    { label: 'จุดแวะ', value: `${s.totals.stops} จุด` },
    { label: 'ระยะทางรวม', value: fmtKm(s.totals.km) },
    { label: 'เวลาเดินทางรวม', value: fmtDuration(s.totals.travelMin) },
  ];

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-5 p-4 md:p-7 print:max-w-none print:p-0">
      <header className={cn(card, 'flex flex-col gap-4 p-4 md:p-6')}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Image src="/brand/huglao-emblem.png" alt="HUGLAO" width={40} height={40} unoptimized className="h-10 w-10" />
          <span className="rounded-[8px] bg-brand-soft px-2.5 py-1 text-[12px] font-semibold tabular-nums text-brand-hover">{trip.code}</span>
          <span className="text-[13px] text-placeholder">
            <b className="font-bold tracking-[.04em] text-brand-hover">HUGMAP</b> · สรุปเส้นทาง
          </span>
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
            <Button icon="picture_as_pdf" onClick={() => window.print()} className="md:!h-10 !px-3.5 !text-[13px]">
              พิมพ์ / PDF
            </Button>
          </div>
        </div>
        <div>
          <h1 className="text-[28px] font-bold leading-[1.25] tracking-[-0.01em] md:text-[34px]">{trip.name}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {trip.client_name} · {trip.pax} ท่าน · {s.range}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[14px] border border-line bg-line md:grid-cols-4">
          {stats.map((t) => (
            <div key={t.label} className="bg-surface px-4 py-3">
              <dt className="text-label">{t.label}</dt>
              <dd className="mt-0.5 text-[22px] font-bold tabular-nums">{t.value}</dd>
            </div>
          ))}
        </dl>
        {staff && routing && <p className="no-print text-[12px] text-muted">กำลังคำนวณเส้นทางตามถนนจริง…</p>}
      </header>

      {s.days.map((d) => (
        <DaySection key={d.id} day={d} startDate={trip.start_date} radiusKm={data.radiusKm} staff={staff} onAdd={onAddNearby} />
      ))}

      <p className="text-[12px] leading-[1.6] text-placeholder">เวลาเดินทางเป็นค่าประมาณ อาจเปลี่ยนตามสภาพถนนและการจราจร · แผนที่ © Google</p>
    </div>
  );
}

function DaySection({
  day,
  startDate,
  radiusKm,
  staff,
  onAdd,
}: {
  day: DayView;
  startDate: string;
  radiusKm: number;
  staff: boolean;
  onAdd?: (dayId: string, hit: NearbyHit, atIndex: number) => void;
}) {
  const stopPts = useMemo(() => day.places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, name: p.name, category: p.category })), [day.places]);
  const nearbyPts = useMemo(() => day.nearby.map((h) => ({ id: h.place.id, lat: h.place.lat, lng: h.place.lng, name: h.place.name, category: h.place.category })), [day.nearby]);
  const span = day.firstMin != null && day.lastMin != null ? `${fmtClock(day.firstMin)}–${fmtClock(day.lastMin)}` : '';
  const radiusLabel = radiusKm < 1 ? `${radiusKm * 1000} ม.` : `${radiusKm} กม.`;

  return (
    <section className={cn(card, 'flex flex-col gap-4 p-4 [break-inside:avoid] md:p-6')}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-8 items-center rounded-[9px] bg-brand px-3 text-[14px] font-semibold text-white">วันที่ {day.dayNo}</span>
        <span className="text-[14px] font-medium">
          {fmtThaiDate(startDate, day.dayNo - 1)}
          {span && ` · ${span}`}
        </span>
        <span className="text-[13px] text-muted md:ml-auto">
          {day.stops.length} จุด · {fmtKm(day.km)} · เดินทาง {fmtDuration(day.travelMin)}
        </span>
      </div>

      {day.stops.length === 0 ? (
        <p className="rounded-item bg-panel px-4 py-3 text-[14px] text-muted">ยังไม่มีจุดแวะในวันนี้</p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative h-[260px] overflow-hidden rounded-[14px] bg-map md:h-[380px]">
            <LazyMap stops={stopPts} nearby={nearbyPts} routeLine={day.line} fitKey={day.id} />
          </div>
          <ol className="flex flex-col">
            {day.stops.map((st, i) => {
              const last = i === day.stops.length - 1;
              return (
                <li key={st.place.id} className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-3">
                  <div className="flex flex-col items-center self-stretch">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border-2 border-ink text-[11px] font-bold tabular-nums">{i + 1}</div>
                    {!last && <div className="flex-1 border-l-[1.5px] border-dashed border-line-dash" />}
                  </div>
                  <div className="min-w-0 pb-3.5">
                    <div className="text-title">{st.place.name}</div>
                    <div className="text-[12px] leading-[1.6] text-placeholder">
                      {CAT[st.place.category].label} · {fmtDuration(st.place.duration_min)}
                      {st.place.fee ? ` · ${st.place.fee}` : ''}
                    </div>
                    {st.leg && (
                      <div className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                        <Icon name={st.leg.walk ? 'directions_walk' : 'directions_car'} className="text-[15px] text-brand" />
                        {fmtKm(st.leg.km)} · {st.leg.walk ? 'เดิน' : 'รถ'} {fmtDuration(st.leg.min)}
                      </div>
                    )}
                  </div>
                  <div className="pt-0.5 text-[14px] font-semibold tabular-nums">{fmtClock(st.startMin)}</div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {day.nearby.length > 0 && (
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
                    ห่าง {fmtKm(h.distanceKm)} · ช่วงจุด {h.segment + 1}–{h.segment + 2}
                  </div>
                </div>
                {staff && onAdd && (
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
