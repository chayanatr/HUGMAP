'use client';
// เพิ่ม/แก้ไขสถานที่แบบเร็วบนหน้าแผนที่: กดปุ่มแล้วกรอกรายละเอียดทันที ไม่ต้องออกจากแผนที่ (รูปภาพ/ย้ายหมุดใช้ฟอร์มเต็ม)
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCategories } from '@/components/CategoriesProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { resolveRegion } from '@/lib/geocode';
import { validatePlace } from '@/lib/placeValidation';
import { createPlace, updatePlace } from '@/lib/places';
import { PROVINCES } from '@/lib/provinces';

export interface QuickPlaceInit {
  /** มี id = แก้ไขสถานที่เดิม */
  id?: string;
  photos?: string[];
  name: string;
  category: string;
  province: string;
  district: string;
  lat: number;
  lng: number;
  open: string;
  fee: string;
  duration: string;
  desc: string;
  /** ลิงก์ไปฟอร์มเต็ม (รูปภาพ ย้ายหมุด) */
  fullFormHref: string;
}

const PROVINCE_OPTIONS = [{ value: '', label: 'เลือกแขวง' }, ...PROVINCES.map((p) => ({ value: p.key, label: p.label }))];

export function QuickPlaceDialog({ init, onSaved, onClose }: { init: QuickPlaceInit; onSaved: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const { list: categories } = useCategories();
  const editing = !!init.id;
  const [f, setF] = useState({
    name: init.name,
    category: init.category,
    province: init.province,
    district: init.district,
    open: init.open,
    fee: init.fee,
    duration: init.duration,
    desc: init.desc,
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const touched = useRef(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  // เพิ่มใหม่ที่ยังไม่รู้แขวง (คลิกที่ว่างบนแผนที่) → หาแขวง/เมืองจากพิกัดให้อัตโนมัติ
  useEffect(() => {
    if (editing || init.province) return;
    let cancelled = false;
    resolveRegion(init.lat, init.lng).then((r) => {
      if (cancelled || touched.current) return;
      setF((cur) => ({ ...cur, province: r.province, district: r.district ?? cur.district }));
      setNote(r.estimated ? 'แขวงคาดจากตำแหน่ง — กรุณาตรวจสอบ' : 'แขวง/เมืองตรงกับตำแหน่งบนแผนที่');
    });
    return () => {
      cancelled = true;
    };
  }, [editing, init.lat, init.lng, init.province]);

  const errors = submitted ? validatePlace({ name: f.name, lat: String(init.lat), lng: String(init.lng), duration: f.duration, province: f.province }) : {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (Object.keys(validatePlace({ name: f.name, lat: String(init.lat), lng: String(init.lng), duration: f.duration, province: f.province })).length) return;
    setSaving(true);
    try {
      const input = {
        name: f.name.trim(),
        category: f.category,
        province: f.province,
        district: f.district.trim() || null,
        lat: init.lat,
        lng: init.lng,
        open_hours: f.open.trim() || null,
        fee: f.fee.trim() || null,
        duration_min: f.duration ? Math.round(+f.duration) : 30,
        description: f.desc.trim() || null,
        photos: init.photos ?? [],
      };
      if (init.id) await updatePlace(init.id, input);
      else await createPlace(input);
      toast(editing ? 'บันทึกการแก้ไขแล้ว' : `เพิ่ม “${input.name}” แล้ว`);
      onSaved();
    } catch {
      setError('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[94vh] w-[min(94vw,520px)] overflow-y-auto rounded-section bg-surface p-0 text-ink shadow-dropdown backdrop:bg-ink/40 max-md:m-0 max-md:mt-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none"
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-3.5 p-5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-h2">{editing ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่'}</h2>
            <div className="mt-0.5 text-[12px] tabular-nums text-muted">
              {init.lat.toFixed(5)}, {init.lng.toFixed(5)}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="-mr-2 -mt-2 grid h-11 w-11 place-items-center rounded-input text-muted hover:text-ink focus-visible:outline-none focus-visible:shadow-focus">
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        <Input label="ชื่อสถานที่" required value={f.name} onChange={(e) => set('name', e.target.value)} error={errors.name} placeholder="เช่น วัดเชียงทอง" autoFocus={!f.name} />
        <Select label="หมวด" required options={categories.map((c) => ({ value: c.key, label: c.label }))} value={f.category} onChange={(e) => set('category', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="แขวง"
            required
            options={PROVINCE_OPTIONS}
            value={f.province}
            onChange={(e) => {
              touched.current = true;
              setNote('');
              set('province', e.target.value);
            }}
          />
          <Input
            label="เมือง"
            placeholder="เช่น เมืองวังเวียง"
            value={f.district}
            onChange={(e) => {
              touched.current = true;
              setNote('');
              set('district', e.target.value);
            }}
          />
        </div>
        {(errors.province || note) && (
          <span role={errors.province ? 'alert' : undefined} className={errors.province ? 'text-[12px] text-danger-text' : 'text-[12px] text-muted'}>
            {errors.province || note}
          </span>
        )}
        {errors.coord && (
          <span role="alert" className="text-[12px] text-danger-text">
            {errors.coord}
          </span>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Input label="เวลาเปิด–ปิด" placeholder="08:00–17:00" value={f.open} onChange={(e) => set('open', e.target.value)} />
          <Input label="ค่าเข้า" placeholder="20,000 กีบ" value={f.fee} onChange={(e) => set('fee', e.target.value)} />
        </div>
        <Input label="เวลาแนะนำ (นาที)" type="number" inputMode="numeric" min={1} value={f.duration} onChange={(e) => set('duration', e.target.value)} error={errors.duration} />
        <Textarea label="รายละเอียด" rows={3} placeholder="ข้อมูลสำหรับไกด์และลูกค้า" value={f.desc} onChange={(e) => set('desc', e.target.value)} />

        {error && (
          <p role="alert" className="rounded-item bg-danger-soft px-3.5 py-3 text-[13px] text-danger-text">
            {error}
          </p>
        )}
        <a href={init.fullFormHref} className="flex min-h-[44px] items-center gap-1.5 text-[13px] text-brand-hover underline focus-visible:outline-none focus-visible:shadow-focus">
          <Icon name="photo_library" className="text-[18px]" />
          {editing ? 'เพิ่มรูปภาพ / ย้ายตำแหน่งหมุด (ฟอร์มเต็ม)' : 'บันทึกแล้วเพิ่มรูปภาพได้ที่ฟอร์มเต็ม'}
        </a>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'กำลังบันทึก…' : editing ? 'บันทึกการแก้ไข' : 'บันทึกสถานที่'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
