'use client';
import { useEffect, useRef, useState } from 'react';
import { MapSearch } from '@/components/MapSearch';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useCategories } from '@/components/CategoriesProvider';
import { cn } from '@/lib/cn';
import { useLocationHelp } from '@/components/LocationHelp';
import { getMyPosition } from '@/lib/geolocation';
import type { Endpoint, Place } from '@/lib/types';

export type EndpointKind = 'start' | 'end';
/** ร่างจุดรับ/ส่งระหว่างแก้ไข — พิกัดว่าง = ยังไม่ได้เลือก */
export interface EndpointDraft {
  name: string;
  lat: number | null;
  lng: number | null;
  /** หมายเหตุที่จุดนี้ (แสดงในตารางเดินทางลูกค้า) */
  note: string;
}

export const KIND_LABEL: Record<EndpointKind, string> = { start: 'จุดรับลูกค้า', end: 'จุดส่งลูกค้า' };
const DEFAULT_NAME: Record<EndpointKind, string> = { start: 'จุดรับลูกค้า', end: 'จุดส่งลูกค้า' };

/**
 * ตั้งจุดรับ/ส่งของวัน: เลือกจากสถานที่ในระบบ / แตะบนแผนที่ / ตำแหน่งปัจจุบัน (GPS) แล้วตั้งชื่อ
 * ควบคุมจากหน้าที่เรียก (draft อยู่ที่หน้า) เพราะ "แตะบนแผนที่" ต้องปิดกล่องชั่วคราวเพื่อให้กดแผนที่ได้
 */
export function EndpointDialog({
  kind,
  dayNo,
  open,
  draft,
  hasExisting,
  places,
  onChange,
  onPickOnMap,
  onSave,
  onClear,
  onClose,
}: {
  kind: EndpointKind;
  dayNo: number;
  open: boolean;
  draft: EndpointDraft;
  hasExisting: boolean;
  places: Place[];
  onChange: (d: EndpointDraft) => void;
  onPickOnMap: () => void;
  onSave: (e: Endpoint, note: string | null) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const { cat } = useCategories();
  const { handleError: handleGeoError } = useLocationHelp();
  const [gps, setGps] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setShowErrors(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // ทางลัด: ที่พักที่บันทึกไว้ (จุดรับ/ส่งมักเป็นโรงแรม) — ค้นชื่ออื่นหรือสถานที่บน Google ใช้ช่องค้นหาด้านบน
  const stays = places.filter((p) => p.category === 'stay').slice(0, 4);

  const hasCoords = draft.lat != null && draft.lng != null;
  const nameError = showErrors && !draft.name.trim() ? 'กรุณากรอกชื่อจุด' : '';

  function pickPlace(p: Place) {
    onChange({ ...draft, name: p.name, lat: p.lat, lng: p.lng });
  }

  async function useGps() {
    if (gps) return;
    setGps(true);
    try {
      const fix = await getMyPosition();
      onChange({ ...draft, name: draft.name.trim() || DEFAULT_NAME[kind], lat: fix.lat, lng: fix.lng });
    } catch (e) {
      handleGeoError(e, useGps);
    } finally {
      setGps(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!draft.name.trim() || draft.lat == null || draft.lng == null) return;
    onSave({ name: draft.name.trim(), lat: draft.lat, lng: draft.lng }, draft.note.trim() || null);
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[92vh] w-[min(92vw,460px)] overflow-y-auto rounded-section bg-surface p-0 text-ink shadow-dropdown backdrop:bg-ink/40"
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 p-5">
        <h2 className="text-h2">
          {KIND_LABEL[kind]} · วันที่ {dayNo}
        </h2>

        <div className="flex flex-col gap-2">
          <div className="text-label">1. เลือกตำแหน่ง</div>
          {/* ค้นทั้งสถานที่ในระบบและ Google Maps (สนามบิน โรงแรม ร้านอาหาร ฯลฯ) */}
          <MapSearch
            places={places}
            onSelectSaved={pickPlace}
            onPickGoogle={(loc) => onChange({ ...draft, name: loc.name || draft.name, lat: loc.lat, lng: loc.lng })}
          />
          {stays.length > 0 && <div className="text-label">ที่พักที่บันทึกไว้</div>}
          <ul className="flex flex-col gap-1.5">
            {stays.map((p) => {
              const selected = hasCoords && draft.lat === p.lat && draft.lng === p.lng;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pickPlace(p)}
                    aria-pressed={selected}
                    className={cn(
                      'flex min-h-[44px] w-full items-center gap-2 rounded-input border px-3 text-left text-[14px] focus-visible:outline-none focus-visible:shadow-focus',
                      selected ? 'border-brand bg-brand-soft' : 'border-line-border bg-surface hover:bg-bg',
                    )}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cat(p.category).color }} />
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="shrink-0 text-label">{cat(p.category).label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" icon="ads_click" onClick={onPickOnMap} className="!px-2 !text-[13px]">
              แตะบนแผนที่
            </Button>
            <Button variant="outline" icon={gps ? 'location_searching' : 'my_location'} onClick={useGps} disabled={gps} className="!px-2 !text-[13px]">
              ตำแหน่งปัจจุบัน
            </Button>
          </div>
          <p className={cn('flex items-center gap-1 text-[12px]', showErrors && !hasCoords ? 'text-danger-text' : 'text-muted')} role={showErrors && !hasCoords ? 'alert' : undefined}>
            <Icon name={hasCoords ? 'check_circle' : 'info'} className="text-[15px]" />
            {hasCoords ? `พิกัด ${draft.lat!.toFixed(5)}, ${draft.lng!.toFixed(5)}` : 'ยังไม่ได้เลือกตำแหน่ง'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-label">2. ตั้งชื่อ</div>
          <Input label="ชื่อจุด" required value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} error={nameError} placeholder="เช่น สนามบินหลวงพระบาง" />
          <Textarea
            label="หมายเหตุ (แสดงในตารางเดินทางลูกค้า)"
            rows={3}
            maxLength={600}
            placeholder={kind === 'start' ? 'เช่น หลังผ่านตรวจคนเข้าเมืองแล้ว ออกเดินทางสู่วังเวียง กรุณารับประทานอาหารเช้าก่อนขึ้นรถ' : 'เช่น พักผ่อน ชมวิว และรับประทานอาหารเย็น'}
            value={draft.note}
            onChange={(e) => onChange({ ...draft, note: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          {hasExisting && (
            <Button variant="danger" onClick={onClear}>
              ลบจุดนี้
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit">บันทึก</Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
