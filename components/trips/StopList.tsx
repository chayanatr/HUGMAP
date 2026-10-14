'use client';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Fragment } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';
import { useCategories } from '@/components/CategoriesProvider';
import { cn } from '@/lib/cn';
import { fmtClock, fmtDuration, fmtKm, parseOpenHours } from '@/lib/geo';
import { KIND_LABEL, type EndpointKind } from '@/components/trips/EndpointDialog';
import type { Endpoint, Leg, NearbyHit, ScheduledStop } from '@/lib/types';

export function StopList({
  stops,
  hits,
  start,
  end,
  startLeg,
  departMin,
  arriveMin,
  onEditEndpoint,
  onMove,
  onRemove,
  onAddNearby,
}: {
  stops: ScheduledStop[];
  hits: NearbyHit[];
  /** จุดรับ/ส่งของวัน (null = ยังไม่ตั้ง → แสดงปุ่มตั้ง) */
  start: Endpoint | null;
  end: Endpoint | null;
  startLeg: Leg | null;
  departMin: number;
  arriveMin: number | null;
  onEditEndpoint: (kind: EndpointKind) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onAddNearby: (hit: NearbyHit, atIndex: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = stops.map((s) => s.place.id);

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onMove(ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col">
          <EndpointRow kind="start" endpoint={start} detail={`ออกเดินทาง ${fmtClock(departMin)}`} onEdit={() => onEditEndpoint('start')} />
          {start && startLeg && (
            <LegRow
              leg={startLeg}
              label={stops.length ? 'ไปจุดแวะแรก' : 'ไปจุดส่ง'}
              hint={hits.find((h) => h.segment === -1)}
              onAdd={(h) => onAddNearby(h, 0)}
            />
          )}
          {stops.map((s, i) => {
            const hint = hits.find((h) => h.segment === i);
            const last = i === stops.length - 1;
            return (
              <Fragment key={s.place.id}>
                <SortableStop stop={s} total={stops.length} onRemove={() => onRemove(i)} onMoveUp={() => onMove(i, i - 1)} />
                {s.leg && <LegRow leg={s.leg} label={last ? 'ไปจุดส่ง' : 'ไปจุดถัดไป'} hint={hint} onAdd={(h) => onAddNearby(h, i + 1)} />}
              </Fragment>
            );
          })}
          <EndpointRow kind="end" endpoint={end} detail={arriveMin != null ? `ถึง ${fmtClock(arriveMin)}` : ''} onEdit={() => onEditEndpoint('end')} />
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableStop({ stop, total, onRemove, onMoveUp }: { stop: ScheduledStop; total: number; onRemove: () => void; onMoveUp: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } = useSortable({ id: stop.place.id });
  const { place, index } = stop;
  const c = useCategories().cat(place.category);
  const ends = index === 0 || index === total - 1;
  const close = parseOpenHours(place.open_hours)?.close;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative flex items-center gap-3 rounded-[14px] bg-surface px-3.5 py-3 shadow-stop',
        isDragging && 'z-10 opacity-70 shadow-dropdown',
        isOver && !isDragging && 'ring-2 ring-brand',
      )}
    >
      <div
        className={cn(
          'grid h-[26px] w-[26px] shrink-0 place-items-center text-[11px] font-bold tabular-nums',
          ends ? 'rounded-full bg-brand text-white' : 'rounded-pill border-2 border-ink bg-surface text-ink',
        )}
      >
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-title">{place.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-placeholder">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
          <span>{c.label}</span>
          <span>·</span>
          <span>{fmtDuration(place.duration_min)}</span>
          {stop.waitMin > 0 && (
            <Pill tone="warning" small>
              ว่าง {fmtDuration(stop.waitMin)}
            </Pill>
          )}
        </div>
        {stop.closesBeforeEnd && close != null && <div className="mt-0.5 text-[12px] text-danger-text">ปิด {fmtClock(close)} ก่อนเวลาออก</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[14px] font-semibold tabular-nums">{fmtClock(stop.startMin)}</div>
        <div className="text-label tabular-nums">ถึง {fmtClock(stop.endMin)}</div>
      </div>
      <div className="flex shrink-0 items-center">
        {/* mobile: ปุ่มเลื่อนขึ้นแทนการลาก */}
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label={`เลื่อน ${place.name} ขึ้น`}
          className="grid h-11 w-11 place-items-center rounded-input text-muted focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-30 md:hidden"
        >
          <Icon name="arrow_upward" className="text-[20px]" />
        </button>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`ลากเพื่อเรียง ${place.name}`}
          className="hidden h-8 w-6 cursor-grab touch-none place-items-center rounded-pill text-label hover:text-muted focus-visible:outline-none focus-visible:shadow-focus active:cursor-grabbing md:grid"
        >
          <Icon name="drag_indicator" className="text-[20px]" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`นำ ${place.name} ออก`}
          className="grid h-11 w-11 place-items-center rounded-input text-label hover:text-danger-text focus-visible:outline-none focus-visible:shadow-focus md:h-8 md:w-8"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
    </li>
  );
}

/** จุดรับ/ส่งลูกค้า: ตั้งแล้วเป็นการ์ดแก้ไขได้ ยังไม่ตั้งเป็นปุ่มเส้นประ (ไม่ลาก/ไม่เรียงลำดับ) */
function EndpointRow({ kind, endpoint, detail, onEdit }: { kind: EndpointKind; endpoint: Endpoint | null; detail: string; onEdit: () => void }) {
  const isStart = kind === 'start';
  if (!endpoint) {
    return (
      <li className={cn(isStart ? 'mb-1.5' : 'mt-1.5')}>
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-line-dash text-[13px] font-semibold text-brand-hover hover:bg-bg focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name={isStart ? 'trip_origin' : 'flag'} className="text-[18px]" />+ ตั้ง{KIND_LABEL[kind]}
        </button>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 rounded-[14px] bg-surface px-3.5 py-3 shadow-stop">
      <div className={cn('grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-white', isStart ? 'bg-brand' : 'bg-ink')}>
        <Icon name={isStart ? 'trip_origin' : 'flag'} className="text-[16px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-title">{endpoint.name}</div>
        <div className="text-[12px] text-placeholder">
          {KIND_LABEL[kind]}
          {detail && ` · ${detail}`}
        </div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`แก้ไข${KIND_LABEL[kind]}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-input text-muted hover:text-ink focus-visible:outline-none focus-visible:shadow-focus md:h-8 md:w-8"
      >
        <Icon name="edit" className="text-[18px]" />
      </button>
    </li>
  );
}

/** ช่วงระหว่างจุด: เส้นประ + เวลาเดินทาง + แนะนำระหว่างทาง */
function LegRow({ leg, label, hint, onAdd }: { leg: Leg; label: string; hint?: NearbyHit; onAdd: (h: NearbyHit) => void }) {
  return (
    <li className="flex gap-3 px-3.5">
      <div className="flex w-[26px] shrink-0 justify-center">
        <div className="border-l-[1.5px] border-dashed border-line-dash" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-2">
        <div className="flex items-center gap-1 text-[12px] text-muted">
          <Icon name={leg.walk ? 'directions_walk' : 'directions_car'} className="text-[15px] text-brand" />
          {label} {fmtKm(leg.km)} · {leg.walk ? 'เดิน' : 'รถ'} {fmtDuration(leg.min)}
        </div>
        {hint && (
          <div className="flex items-center gap-2 rounded-input bg-brand-soft py-1.5 pl-2.5 pr-1.5">
            <Icon name="near_me" className="text-[16px] text-brand" />
            <div className="min-w-0 flex-1 text-[12px] leading-[1.5] text-brand-deep">
              <b className="font-semibold">ระหว่างทาง</b> {hint.place.name} · ห่าง {fmtKm(hint.distanceKm)}
            </div>
            <button
              type="button"
              onClick={() => onAdd(hint)}
              className="h-11 shrink-0 rounded-[8px] bg-surface px-2.5 text-[12px] font-semibold text-brand-hover focus-visible:outline-none focus-visible:shadow-focus md:h-7"
            >
              + เพิ่ม
            </button>
          </div>
        )}
      </div>
    </li>
  );
}