'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtKm } from '@/lib/geo';
import { clockToMin, fmtThaiDate, splitUnit } from '@/lib/format';
import type { DayData } from '@/lib/trips';
import type { ScheduledStop, Trip } from '@/lib/types';

type Sched = { stops: ScheduledStop[]; km: number; travelMin: number; firstMin: number | null; lastMin: number | null; arriveMin: number | null };

export function TripCard({
  trip,
  days,
  dayIdx,
  sched,
  hasStart,
  departMin,
  isRoad,
  routeLoading,
  onDayInfo,
  onSelectDay,
  onAddDay,
  onDeleteDay,
  onEdit,
}: {
  trip: Trip;
  days: DayData[];
  dayIdx: number;
  sched: Sched;
  /** มีจุดรับ → เวลาเริ่มคือเวลาออกจากจุดรับ ไม่ใช่เวลาถึงจุดแวะแรก */
  hasStart: boolean;
  /** เวลาออกเดินทางของวันที่เลือก */
  departMin: number;
  isRoad: boolean;
  routeLoading: boolean;
  /** บันทึกชื่อวัน/เวลาออกเดินทาง (startMin null = ใช้เวลาเริ่มของทริป) */
  onDayInfo: (patch: { title?: string | null; startMin?: number | null }) => void;
  onSelectDay: (i: number) => void;
  onAddDay: () => void;
  onDeleteDay: () => void;
  onEdit: () => void;
}) {
  const [kmNum, kmUnit] = splitUnit(fmtKm(sched.km));
  const finishMin = sched.arriveMin ?? sched.lastMin;
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
                {fmtThaiDate(trip.start_date, days[dayIdx]?.dayNo ? days[dayIdx].dayNo - 1 : 0)} · {fmtClock(hasStart ? departMin : (sched.firstMin ?? departMin))}
              </div>
            </div>
            <div>
              <div className="text-label">จบ</div>
              <div className="text-value tabular-nums">{finishMin != null ? `${fmtClock(finishMin)} · ${sched.stops.length} จุด` : '— · 0 จุด'}</div>
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

      {days[dayIdx] && <DayInfoRow key={days[dayIdx].id} day={days[dayIdx]} tripStartMin={trip.day_start_min} onChange={onDayInfo} />}    </Card>
  );
}

/** ชื่อวัน + เวลาออกเดินทางของวันที่เลือก (แสดงในตารางเดินทางลูกค้า) — บันทึกเมื่อออกจากช่อง */
function DayInfoRow({
  day,
  tripStartMin,
  onChange,
}: {
  day: DayData;
  tripStartMin: number;
  onChange: (patch: { title?: string | null; startMin?: number | null }) => void;
}) {
  const [title, setTitle] = useState(day.title ?? '');
  const startMin = day.startMin ?? tripStartMin;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_112px] items-end gap-2 border-t border-line px-4 py-3">
      <Input
        label={`ชื่อวันที่ ${day.dayNo} (ใช้ในตารางลูกค้า)`}
        placeholder="เช่น วังเวียง–เมืองเฟือง"
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() !== (day.title ?? '') && onChange({ title: title.trim() || null })}
      />
      <Input
        label="ออกเดินทาง"
        type="time"
        value={fmtClock(startMin)}
        onChange={(e) => e.target.value && onChange({ startMin: clockToMin(e.target.value) })}
      />
    </div>
  );
}