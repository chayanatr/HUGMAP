'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import type { Place, StopMeta } from '@/lib/types';

const PRESETS = [
  { label: 'รับประทานอาหารกลางวัน', min: 60 },
  { label: 'รับประทานอาหารเย็น', min: 90 },
  { label: 'พักผ่อน/ห้องน้ำ', min: 20 },
];

/** รายละเอียดของจุดแวะในตารางเดินทาง: คำอธิบาย เวลาอยู่ที่จุดนี้ และพักหลังจุดนี้ (เช่น มื้อกลางวัน) */
export function StopDialog({
  open,
  place,
  meta,
  onSave,
  onClose,
}: {
  open: boolean;
  place: Place | null;
  meta: StopMeta | undefined;
  onSave: (meta: StopMeta) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState('');
  const [stay, setStay] = useState('');
  const [breakLabel, setBreakLabel] = useState('');
  const [breakMin, setBreakMin] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setNote(meta?.note ?? '');
      setStay(meta?.stayMin ? String(meta.stayMin) : '');
      setBreakLabel(meta?.breakLabel ?? '');
      setBreakMin(meta?.breakMin ? String(meta.breakMin) : '');
      setShowErrors(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, meta]);

  const stayN = stay ? Math.round(+stay) : null;
  const breakN = breakMin ? Math.round(+breakMin) : null;
  const errors = {
    stay: stayN != null && (stayN < 5 || stayN > 720) ? 'ใส่ 5–720 นาที หรือเว้นว่าง' : '',
    breakMin: breakN != null && (breakN < 5 || breakN > 480) ? 'ใส่ 5–480 นาที' : '',
    breakLabel: breakN != null && !breakLabel.trim() ? 'กรุณากรอกชื่อช่วงพัก' : '',
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (Object.values(errors).some(Boolean)) return;
    onSave({
      note: note.trim() || null,
      stayMin: stayN,
      breakLabel: breakN != null ? breakLabel.trim() : null,
      breakMin: breakN,
    });
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[92vh] w-[min(92vw,460px)] overflow-y-auto rounded-section bg-surface p-0 text-ink shadow-dropdown backdrop:bg-ink/40"
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 p-5">
        <h2 className="text-h2">รายละเอียด · {place?.name}</h2>
        <Textarea
          label="คำอธิบายในตารางเดินทาง"
          rows={3}
          maxLength={600}
          placeholder={place?.description ?? 'เช่น ชมธรรมชาติและถ่ายรูป ผู้ที่สะดวกเดินบันไดสามารถขึ้นชมถ้ำได้'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Input
          label={`เวลาอยู่ที่จุดนี้ (นาที) — ว่าง = ${place?.duration_min ?? 30} นาที`}
          type="number"
          inputMode="numeric"
          min={5}
          value={stay}
          onChange={(e) => setStay(e.target.value)}
          error={showErrors ? errors.stay : ''}
        />
        <fieldset className="flex flex-col gap-3 rounded-item border border-line-border p-3">
          <legend className="px-1 text-[12px] font-medium text-muted">พักหลังจุดนี้ (ก่อนเดินทางต่อ)</legend>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setBreakLabel(p.label);
                  setBreakMin(String(p.min));
                }}
                className="h-11 rounded-input bg-brand-soft px-3 text-[13px] font-semibold text-brand-hover focus-visible:outline-none focus-visible:shadow-focus md:h-9"
              >
                {p.label} {p.min} นาที
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
            <Input label="ชื่อช่วงพัก" maxLength={60} value={breakLabel} onChange={(e) => setBreakLabel(e.target.value)} error={showErrors ? errors.breakLabel : ''} />
            <Input label="นาที" type="number" inputMode="numeric" min={5} value={breakMin} onChange={(e) => setBreakMin(e.target.value)} error={showErrors ? errors.breakMin : ''} />
          </div>
          {(breakLabel || breakMin) && (
            <Button
              variant="soft"
              onClick={() => {
                setBreakLabel('');
                setBreakMin('');
              }}
              className="self-start"
            >
              ไม่พักหลังจุดนี้
            </Button>
          )}
        </fieldset>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit">บันทึก</Button>
        </div>
      </form>
    </dialog>
  );
}
