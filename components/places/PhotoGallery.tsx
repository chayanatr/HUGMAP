'use client';
/* eslint-disable @next/next/no-img-element -- รูปจาก Supabase Storage ไม่ผ่าน image optimizer */
import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';

/** ดูรูปทั้งหมดของสถานที่: เลื่อนซ้าย-ขวา (swipe บนมือถือ) ปิดด้วยปุ่มหรือ Esc — ใช้ <dialog> ของเบราว์เซอร์ */
export function PhotoGallery({ photos, name, open, onClose }: { photos: string[]; name: string; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={`รูปภาพ ${name}`}
      className="m-auto max-h-[94vh] w-[min(96vw,900px)] rounded-section bg-ink p-0 text-white shadow-dropdown backdrop:bg-ink/70"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">
          {name} <span className="font-normal text-dark-muted">· {photos.length} รูป</span>
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-input hover:bg-dark-field focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name="close" className="text-[22px]" />
        </button>
      </div>
      {open && (
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
          {photos.map((src, i) => (
            <li key={src} className="w-[88%] shrink-0 snap-center md:w-[78%]">
              <img src={src} alt={`${name} รูปที่ ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} className="max-h-[72vh] w-full rounded-item bg-dark-field object-contain" />
              <div className="mt-1 text-center text-[12px] tabular-nums text-dark-muted">
                {i + 1} / {photos.length}
              </div>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
