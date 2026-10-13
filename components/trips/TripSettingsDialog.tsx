'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fmtClock } from '@/lib/geo';
import { clockToMin } from '@/lib/format';
import type { Trip } from '@/lib/types';

type Patch = Partial<Pick<Trip, 'name' | 'client_name' | 'pax' | 'start_date' | 'day_start_min'>>;

/** แก้ไขข้อมูลทริป — ใช้ <dialog> ของเบราว์เซอร์ (focus trap + ปิดด้วย Esc ในตัว) */
export function TripSettingsDialog({
  trip,
  open,
  onClose,
  onSave,
  onNewTrip,
}: {
  trip: Trip;
  open: boolean;
  onClose: () => void;
  onSave: (patch: Patch) => void;
  onNewTrip: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ name: trip.name, client: trip.client_name, pax: String(trip.pax), date: trip.start_date, time: fmtClock(trip.day_start_min) });
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setForm({ name: trip.name, client: trip.client_name, pax: String(trip.pax), date: trip.start_date, time: fmtClock(trip.day_start_min) });
      setShowErrors(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, trip]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const errors = {
    name: form.name.trim() ? '' : 'กรุณากรอกชื่อทริป',
    client: form.client.trim() ? '' : 'กรุณากรอกชื่อลูกค้า',
    pax: +form.pax >= 1 ? '' : 'จำนวนต้องมากกว่า 0',
    date: form.date ? '' : 'กรุณาเลือกวันที่เริ่ม',
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (Object.values(errors).some(Boolean)) return;
    onSave({ name: form.name.trim(), client_name: form.client.trim(), pax: Math.round(+form.pax), start_date: form.date, day_start_min: clockToMin(form.time) });
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(92vw,440px)] rounded-section bg-surface p-0 text-ink shadow-dropdown backdrop:bg-ink/40"
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 p-5">
        <h2 className="text-h2">ข้อมูลทริป · {trip.code}</h2>
        <Input label="ชื่อทริป" required value={form.name} onChange={(e) => set('name', e.target.value)} error={showErrors ? errors.name : ''} />
        <Input label="ลูกค้า" required value={form.client} onChange={(e) => set('client', e.target.value)} error={showErrors ? errors.client : ''} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="จำนวนผู้เดินทาง" type="number" inputMode="numeric" min={1} value={form.pax} onChange={(e) => set('pax', e.target.value)} error={showErrors ? errors.pax : ''} />
          <Input label="เวลาเริ่มของแต่ละวัน" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
        </div>
        <Input label="วันที่เริ่มเดินทาง" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} error={showErrors ? errors.date : ''} />
        <div className="flex items-center gap-2 pt-1">
          <Button variant="soft" onClick={onNewTrip}>
            สร้างทริปใหม่
          </Button>
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
