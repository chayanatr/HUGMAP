'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { CATEGORY_HUES, CATEGORY_ICON_GROUPS, toCategoryDef, type CategoryRow } from '@/lib/categories';
import type { CategoryInput } from '@/lib/categoriesApi';
import { cn } from '@/lib/cn';

const MAX_LABEL = 40;

/** สร้าง/แก้ไขหมวดสถานที่ (ชื่อ + ไอคอน + สี) — ใช้ <dialog> ของเบราว์เซอร์ */
export function CategoryDialog({
  open,
  initial,
  usedCount = 0,
  existingLabels,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  /** null = สร้างหมวดใหม่ */
  initial: CategoryRow | null;
  /** จำนวนสถานที่ที่ใช้หมวดนี้ (ลบไม่ได้ถ้ามี) */
  usedCount?: number;
  /** ชื่อหมวดอื่นที่มีอยู่แล้ว (กันชื่อซ้ำ) */
  existingLabels: string[];
  onSave: (input: CategoryInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('place');
  const [hue, setHue] = useState(CATEGORY_HUES[0]);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setLabel(initial?.label ?? '');
      setIcon(initial?.icon ?? 'place');
      setHue(initial?.hue ?? CATEGORY_HUES[Math.floor(Math.random() * CATEGORY_HUES.length)]);
      setShowErrors(false);
      setError('');
      setBusy(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, initial]);

  const trimmed = label.trim();
  const labelError = !trimmed
    ? 'กรุณากรอกชื่อหมวด'
    : trimmed.length > MAX_LABEL
      ? `ชื่อหมวดยาวได้ไม่เกิน ${MAX_LABEL} ตัวอักษร`
      : existingLabels.some((l) => l.trim().toLowerCase() === trimmed.toLowerCase())
        ? 'มีหมวดชื่อนี้อยู่แล้ว'
        : '';
  const preview = toCategoryDef({ key: initial?.key ?? '', label: trimmed || 'ชื่อหมวด', icon, hue, sort: 0 });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    setError('');
    if (labelError || busy) return;
    setBusy(true);
    try {
      await onSave({ label: trimmed, icon, hue });
    } catch {
      setError('บันทึกหมวดไม่สำเร็จ กรุณาลองอีกครั้ง');
      setBusy(false);
    }
  }

  async function remove() {
    if (!onDelete || busy || usedCount > 0) return;
    if (!window.confirm(`ลบหมวด “${initial?.label}” ?`)) return;
    setBusy(true);
    try {
      await onDelete();
    } catch {
      setError('ลบหมวดไม่สำเร็จ กรุณาลองอีกครั้ง');
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[92vh] w-[min(92vw,460px)] overflow-y-auto rounded-section bg-surface p-0 text-ink shadow-dropdown backdrop:bg-ink/40"
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 p-5">
        <h2 className="text-h2">{initial ? 'แก้ไขหมวดสถานที่' : 'เพิ่มหมวดสถานที่'}</h2>

        <div className="flex items-center gap-3 rounded-item bg-panel p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-item text-[24px]" style={{ background: preview.soft, color: preview.color }}>
            <Icon name={icon} />
          </span>
          <span className="min-w-0 truncate text-title">{preview.label}</span>
        </div>

        <Input label="ชื่อหมวด" required maxLength={MAX_LABEL + 10} value={label} onChange={(e) => setLabel(e.target.value)} error={showErrors ? labelError : ''} placeholder="เช่น สปา, ร้านนวด, จุดถ่ายรูป" />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[12px] font-medium text-muted">ไอคอน</legend>
          <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto rounded-input border border-line-border p-2" role="group" aria-label="ไอคอน">
            {CATEGORY_ICON_GROUPS.map((g) => (
              <div key={g.label} className="flex flex-col gap-1.5">
                <div className="text-label">{g.label}</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {g.icons.map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={icon === name}
                      aria-label={name.replaceAll('_', ' ')}
                      title={name.replaceAll('_', ' ')}
                      onClick={() => setIcon(name)}
                      className={cn(
                        'grid h-11 place-items-center rounded-input border text-[22px] text-ink focus-visible:outline-none focus-visible:shadow-focus',
                        icon === name ? 'border-brand bg-brand-soft' : 'border-line-border bg-surface hover:bg-bg',
                      )}
                    >
                      <Icon name={name} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[12px] font-medium text-muted">สี</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="สี">
            {CATEGORY_HUES.map((h) => (
              <button
                key={h}
                type="button"
                aria-pressed={hue === h}
                aria-label={`สี ${h}`}
                onClick={() => setHue(h)}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-full border-2 text-white focus-visible:outline-none focus-visible:shadow-focus',
                  hue === h ? 'border-ink' : 'border-transparent',
                )}
                style={{ background: `oklch(0.6 0.12 ${h})` }}
              >
                {hue === h && <Icon name="check" className="text-[20px]" />}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-item bg-danger-soft px-3.5 py-3 text-[13px] text-danger-text">
            {error}
          </p>
        )}
        {initial && onDelete && usedCount > 0 && (
          <p className="text-[12px] leading-[1.6] text-muted">มี {usedCount} สถานที่ใช้หมวดนี้อยู่ จึงลบไม่ได้ (ย้ายสถานที่ไปหมวดอื่นก่อน)</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          {initial && onDelete && (
            <Button variant="danger" onClick={remove} disabled={busy || usedCount > 0}>
              ลบหมวด
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'กำลังบันทึก…' : 'บันทึก'}
            </Button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
