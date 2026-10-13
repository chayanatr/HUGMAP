'use client';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtKm } from '@/lib/geo';
import { fmtThaiDate, splitUnit } from '@/lib/format';
import type { DayData } from '@/lib/trips';
import type { ScheduledStop, Trip } from '@/lib/types';

type Sched = { stops: ScheduledStop[]; km: number; travelMin: number; firstMin: number | null; lastMin: number | null };

export function TripCard({
  trip,
  days,
  dayIdx,
  sched,
  isRoad,
  routeLoading,
  onSelectDay,
  onAddDay,
  onDeleteDay,
  onEdit,
}: {
  trip: Trip;
  days: DayData[];
  dayIdx: number;
  sched: Sched;
  isRoad: boolean;
  routeLoading: boolean;
  onSelectDay: (i: number) => void;
  onAddDay: () => void;
  onDeleteDay: () => void;
  onEdit: () => void;
}) {
  const [kmNum, kmUnit] = splitUnit(fmtKm(sched.km));
  const hasStops = sched.stops.length > 0;
  const source = routeLoading ? 'กำลังคำนวณเส้นทาง…' : isRoad ? 'ตามถนนจริง' : 'ค่าประมาณ';

  return (
    <Card>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_44px] items-center gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <div className="text-label">รหัสทริป</div>
          <div className="truncate text-title tabular-nums">{trip.code}</div>
        </div>
        <div className="min-w-0">
          <div className="text-label">ลูกค้า</div>
          <div className="text-[14px] font-semibold leading-[1.4]">
            {trip.client_name} · {trip.pax} ท่าน
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="แก้ไขข้อมูลทริป"
          title="แก้ไขข้อมูลทริป"
          className="grid h-11 w-11 place-items-center rounded-item bg-brand-soft text-brand focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name="route" className="text-[22px]" />
        </button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 border-t border-line px-4 py-3">
        <div>
          <div className="text-label">ระยะทาง · {source}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-stat tabular-nums">{kmNum}</span>
            <span className="text-[13px] font-medium text-muted">{kmUnit}</span>
          </div>
          <div className="text-[12px] text-muted">เดินทาง {fmtDuration(sched.travelMin)}</div>
        </div>
        <div className="grid grid-cols-[12px_minmax(0,1fr)] gap-x-2.5">
          <div className="flex flex-col items-center py-1">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-ink" />
            <span className="my-0.5 flex-1 border-l-[1.5px] border-dashed border-line-dash" />
            <span className="h-2.5 w-2.5 rounded-pill border-2 border-ink" />
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="text-label">เริ่ม</div>
              <div className="text-value tabular-nums">
                {fmtThaiDate(trip.start_date, days[dayIdx]?.dayNo ? days[dayIdx].dayNo - 1 : 0)} · {fmtClock(sched.firstMin ?? trip.day_start_min)}
              </div>
            </div>
            <div>
              <div className="text-label">จบ</div>
              <div className="text-value tabular-nums">{hasStops ? `${fmtClock(sched.lastMin ?? 0)} · ${sched.stops.length} จุด` : '— · 0 จุด'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {days.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelectDay(i)}
            aria-pressed={i === dayIdx}
            className={cn(
              'h-11 rounded-input px-3.5 text-[13px] font-semibold focus-visible:outline-none focus-visible:shadow-focus md:h-9',
              i === dayIdx ? 'bg-brand text-white' : 'bg-bg text-ink hover:bg-line',
            )}
          >
            วันที่ {d.dayNo}
          </button>
        ))}
        <button
          type="button"
          onClick={onAddDay}
          aria-label="เพิ่มวัน"
          className="grid h-11 w-11 place-items-center rounded-input border border-dashed border-line-dash text-brand-hover hover:bg-bg focus-visible:outline-none focus-visible:shadow-focus md:h-9 md:w-9"
        >
          <Icon name="add" className="text-[18px]" />
        </button>
        {days.length > 1 && (
          <button
            type="button"
            onClick={onDeleteDay}
            className="ml-auto h-11 rounded-input px-2 text-[13px] text-danger-text hover:bg-danger-soft focus-visible:outline-none focus-visible:shadow-focus md:h-9"
          >
            ลบวันนี้
          </button>
        )}
      </div>
    </Card>
  );
}
