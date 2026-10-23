'use client';
// ฟอร์มสถานที่ (ใช้ร่วมกันทั้งเพิ่ม/แก้ไข) — README §2
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { MapSearch } from '@/components/MapSearch';
import { guessCategoryFromGoogle, type PickedLocation } from '@/lib/placesSearch';
import { PageShell, PanelBody, PanelHeader } from '@/components/shell/PageShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { useCategories } from '@/components/CategoriesProvider';
import { CategoryDialog } from '@/components/places/CategoryDialog';
import { LAO_BOUNDS } from '@/lib/categories';
import { resolveRegion } from '@/lib/geocode';
import { PROVINCES } from '@/lib/provinces';
import { createCategory } from '@/lib/categoriesApi';
import { cn } from '@/lib/cn';
import { fixMessage, geoErrorMessage, getMyPosition } from '@/lib/geolocation';
import { prepareImage } from '@/lib/images';
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_COUNT,
  PHOTO_TYPES,
  createPlace,
  deletePlace,
  fetchPlace,
  removePlacePhotos,
  updatePlace,
  uploadPlacePhoto,
  type PlaceInput,
} from '@/lib/places';
import type { CategoryKey } from '@/lib/types';
import { usePlaces } from '@/lib/usePlaces';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export function validatePlace(f: { name: string; lat: string; lng: string; duration: string; province: string }) {
  const e: Record<string, string> = {};
  if (!f.province) e.province = 'กรุณาเลือกแขวง';
  const lat = parseFloat(f.lat), lng = parseFloat(f.lng);
  if (!f.name.trim()) e.name = 'กรุณากรอกชื่อสถานที่';
  if (isNaN(lat) || isNaN(lng)) e.coord = 'กรุณาระบุพิกัด หรือคลิกบนแผนที่';
  else if (lat < LAO_BOUNDS.latMin || lat > LAO_BOUNDS.latMax || lng < LAO_BOUNDS.lngMin || lng > LAO_BOUNDS.lngMax)
    e.coord = 'พิกัดอยู่นอกขอบเขต สปป.ลาว (ละติจูด 13.9–22.5, ลองจิจูด 100.0–107.7)';
  if (f.duration && !(+f.duration > 0)) e.duration = 'เวลาแนะนำต้องมากกว่า 0';
  return e;
}

interface FormState {
  name: string;
  category: CategoryKey;
  province: string;
  district: string;
  lat: string;
  lng: string;
  open: string;
  fee: string;
  duration: string;
  desc: string;
}
const EMPTY: FormState = { name: '', category: 'temple', province: '', district: '', lat: '', lng: '', open: '', fee: '', duration: '30', desc: '' };
const PROVINCE_OPTIONS = [{ value: '', label: 'เลือกแขวง' }, ...PROVINCES.map((p) => ({ value: p.key, label: p.label }))];
const coordKey = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

export default function PlaceForm({ placeId }: { placeId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const editing = !!placeId;
  const { places, status: placesStatus } = usePlaces();
  const { list: categories, reload: reloadCategories } = useCategories();
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loadState, setLoadState] = useState<LoadState>(editing ? 'loading' : 'ready');
  const [savedPhotos, setSavedPhotos] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [target, setTarget] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(null);

  useEffect(() => {
    if (!placeId) return;
    let cancelled = false;
    fetchPlace(placeId)
      .then((p) => {
        if (cancelled) return;
        if (!p) return setLoadState('missing');
        setForm({
          name: p.name,
          category: p.category,
          province: p.province,
          district: p.district ?? '',
          lat: String(p.lat),
          lng: String(p.lng),
          open: p.open_hours ?? '',
          fee: p.fee ?? '',
          duration: String(p.duration_min),
          desc: p.description ?? '',
        });
        setSavedPhotos(p.photos);
        setLoadState('ready');
      })
      .catch(() => !cancelled && setLoadState('error'));
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  // เปิดจากแผนที่ (/places: "เพิ่มเป็นสถานที่ที่นี่") → เติมชื่อ/ที่อยู่/พิกัด/เมืองให้ แก้ไขต่อได้
  useEffect(() => {
    if (editing) return;
    const q = new URLSearchParams(window.location.search);
    const lat = parseFloat(q.get('lat') ?? ''), lng = parseFloat(q.get('lng') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setForm((f) => ({
      ...f,
      name: (q.get('name') ?? '').slice(0, 120),
      desc: (q.get('address') ?? '').slice(0, 300),
      lat: lat.toFixed(6),
      lng: lng.toFixed(6),
      // แขวง/เมืองที่ Google ระบุมากับลิงก์ (ไม่มี = ให้ระบบหาจากพิกัดด้านล่าง)
      province: PROVINCES.some((p) => p.key === q.get('province')) ? (q.get('province') as string) : f.province,
      district: (q.get('district') ?? '').slice(0, 80),
      category: /^[a-z0-9_]{2,32}$/.test(q.get('cat') ?? '') ? (q.get('cat') as string) : f.category,
    }));
    if (PROVINCES.some((p) => p.key === q.get('province'))) resolvedKey.current = coordKey(lat, lng);
    setTarget({ lat, lng, zoom: 17, key: 0 });
  }, [editing]);

  // แขวง/เมืองตรงกับตำแหน่งบนแผนที่อัตโนมัติ: เมื่อพิกัดเปลี่ยน (คลิกแผนที่ ลากหมุด GPS พิมพ์เอง) หาแขวง/เมืองใหม่
  // (ไม่ทับถ้าผู้ใช้แก้แขวง/เมืองเองหลังจากนั้น; เปิดแก้ไขสถานที่เดิมจะไม่ทับค่าที่บันทึกไว้จนกว่าจะย้ายตำแหน่ง)
  const resolvedKey = useRef('');
  const regionTouched = useRef(false);
  const editInitDone = useRef(false);
  const [regionNote, setRegionNote] = useState('');
  useEffect(() => {
    if (loadState !== 'ready') return;
    const lat = parseFloat(form.lat), lng = parseFloat(form.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const key = coordKey(lat, lng);
    if (editing && !editInitDone.current) {
      editInitDone.current = true;
      resolvedKey.current = key;
      return;
    }
    if (resolvedKey.current === key) return;
    const t = setTimeout(async () => {
      const r = await resolveRegion(lat, lng);
      if (regionTouched.current) return;
      resolvedKey.current = key;
      setForm((f) => (coordKey(parseFloat(f.lat), parseFloat(f.lng)) === key ? { ...f, province: r.province, district: r.district ?? '' } : f));
      setRegionNote(r.estimated ? 'คาดจากตำแหน่งบนแผนที่ — กรุณาตรวจสอบ' : 'ตรงกับตำแหน่งบนแผนที่ (ตรวจพบอัตโนมัติ)');
    }, 700);
    return () => clearTimeout(t);
  }, [form.lat, form.lng, loadState, editing]);

  useEffect(() => () => newPhotos.forEach((p) => URL.revokeObjectURL(p.preview)), [newPhotos]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const errors = submitted ? validatePlace(form) : {};

  const latN = parseFloat(form.lat), lngN = parseFloat(form.lng);
  const pin = Number.isFinite(latN) && Number.isFinite(lngN) ? { lat: latN, lng: lngN } : null;
  const contextPlaces = useMemo(() => places.filter((p) => p.id !== placeId), [places, placeId]);

  const pick = (lat: number, lng: number) => {
    regionTouched.current = false; // ย้ายตำแหน่งใหม่ → ให้ระบบหาแขวง/เมืองใหม่
    setForm((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
  };

  // เติมข้อมูลจากสถานที่ที่เลือกบน Google: พิกัด + (ชื่อ/เมือง/หมวดที่เดา) + ที่อยู่ในรายละเอียด
  // overwrite = เลือกจากช่องค้นหา "จาก Google" ในฟอร์ม → แทนที่ชื่อเดิม; ช่องค้นหาบนแผนที่เติมชื่อเฉพาะเมื่อยังว่าง
  const applyGoogle = (loc: PickedLocation, overwrite: boolean) => {
    const guessed = guessCategoryFromGoogle(loc.types);
    // แขวง/เมืองจากที่อยู่ของ Google ตรงกับแผนที่; ถ้า Google ไม่ระบุแขวง ให้ useEffect ด้านบนหาจากพิกัด
    regionTouched.current = false;
    if (loc.province) {
      resolvedKey.current = coordKey(loc.lat, loc.lng);
      setRegionNote('ตรงกับตำแหน่งบนแผนที่ (จาก Google)');
    }
    setForm((f) => {
      const keepName = !overwrite && !!f.name.trim();
      return {
        ...f,
        name: keepName ? f.name : loc.name,
        desc: f.desc.trim() ? f.desc : loc.address,
        lat: loc.lat.toFixed(6),
        lng: loc.lng.toFixed(6),
        province: loc.province ?? f.province,
        district: loc.province ? (loc.district ?? '') : f.district,
        category: !keepName && guessed && categories.some((c) => c.key === guessed) ? guessed : f.category,
      };
    });
    setTarget({ lat: loc.lat, lng: loc.lng, zoom: 17, key: Date.now() });
    if (overwrite) toast('เติมข้อมูลจาก Google แล้ว กรุณาตรวจชื่อ หมวด และรายละเอียดก่อนบันทึก');
  };

  // ใช้ตำแหน่งปัจจุบัน (GPS) เป็นพิกัดสถานที่ — เหมาะเมื่อพนักงานยืนอยู่ที่สถานที่นั้น
  const [locating, setLocating] = useState(false);
  async function fillFromGps() {
    setLocating(true);
    try {
      const fix = await getMyPosition();
      pick(fix.lat, fix.lng);
      toast(fixMessage(fix), fix.accuracy > 100 ? 'error' : 'success');
    } catch (e) {
      toast(geoErrorMessage(e), 'error');
    } finally {
      setLocating(false);
    }
  }

  const [preparing, setPreparing] = useState(false);
  const addPhotos = async (list: FileList | null) => {
    if (!list || preparing) return;
    let err = '';
    const next = [...newPhotos];
    setPreparing(true);
    try {
      for (const file of Array.from(list)) {
        if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
          err = `ไฟล์ต้องเป็น JPG, PNG หรือ WebP ขนาดไม่เกิน ${PHOTO_MAX_BYTES / 1024 / 1024} MB ต่อรูป`;
          continue;
        }
        if (savedPhotos.length + next.length >= PHOTO_MAX_COUNT) {
          err = `แนบรูปได้สูงสุด ${PHOTO_MAX_COUNT} รูปต่อสถานที่`;
          break;
        }
        const ready = await prepareImage(file); // ย่อรูปใหญ่ให้เล็กลงก่อนอัปโหลด
        next.push({ file: ready, preview: URL.createObjectURL(ready) });
      }
    } finally {
      setPreparing(false);
    }
    setPhotoError(err);
    setNewPhotos(next);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setSaveError('');
    if (Object.keys(validatePlace(form)).length) {
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSaving(true);
    let uploaded: string[] = [];
    try {
      uploaded = await Promise.all(newPhotos.map((p) => uploadPlacePhoto(p.file)));
      const input: PlaceInput = {
        name: form.name.trim(),
        category: form.category,
        province: form.province,
        district: form.district.trim() || null,
        lat: latN,
        lng: lngN,
        open_hours: form.open.trim() || null,
        fee: form.fee.trim() || null,
        duration_min: form.duration ? Math.round(+form.duration) : 30,
        description: form.desc.trim() || null,
        photos: [...savedPhotos, ...uploaded],
      };
      if (placeId) await updatePlace(placeId, input);
      else await createPlace(input);
      toast('บันทึกสถานที่แล้ว');
      router.push('/places');
    } catch {
      removePlacePhotos(uploaded).catch(() => {});
      setSaveError('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!placeId) return;
    if (!window.confirm(`ลบ “${form.name}” ออกจากระบบ?\nสถานที่นี้จะถูกนำออกจากทริปที่ใช้อยู่ด้วย และไม่สามารถย้อนกลับได้`)) return;
    setSaving(true);
    try {
      await deletePlace(placeId);
      removePlacePhotos(savedPhotos).catch(() => {});
      toast('ลบสถานที่แล้ว');
      router.push('/places');
    } catch {
      setSaveError('ลบไม่สำเร็จ กรุณาลองอีกครั้ง');
      setSaving(false);
    }
  }

  const header = (
    <PanelHeader>
      <IconButton icon="arrow_back" label="กลับ" href="/places" />
      <div className="min-w-0">
        <div className="text-label">จัดการสถานที่</div>
        <h1 className="truncate text-[16px] font-bold leading-tight">{editing ? `แก้ไข: ${form.name || '…'}` : 'เพิ่มสถานที่ใหม่'}</h1>
      </div>
    </PanelHeader>
  );

  const body =
    loadState !== 'ready' ? (
      <PanelBody>
        <Card className="p-4 text-[14px] leading-[1.6] text-muted" role={loadState === 'loading' ? undefined : 'alert'}>
          {loadState === 'loading' && 'กำลังโหลดข้อมูล…'}
          {loadState === 'missing' && 'ไม่พบสถานที่นี้ อาจถูกลบไปแล้ว'}
          {loadState === 'error' && 'โหลดข้อมูลสถานที่ไม่สำเร็จ'}
        </Card>
        {loadState !== 'loading' && <Button variant="outline" href="/places">กลับไปรายการสถานที่</Button>}
      </PanelBody>
    ) : (
      <PanelBody>
        <Card className="flex flex-col gap-4 p-4">
          {!editing && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <div className="flex flex-col gap-1.5 rounded-item bg-brand-soft p-3">
              <span className="flex items-center gap-1 text-[12px] font-medium text-brand-deep">
                <Icon name="travel_explore" className="text-[16px]" />
                ค้นหาจาก Google Maps เพื่อเติมข้อมูลให้อัตโนมัติ
              </span>
              <MapSearch onPickGoogle={(loc) => applyGoogle(loc, true)} />
              <span className="text-label">เติมชื่อ พิกัด เมือง ที่อยู่ และเดาหมวดให้ แก้ไขได้ก่อนบันทึก</span>
            </div>
          )}
          <Input label="ชื่อสถานที่" required placeholder="เช่น วัดเชียงทอง" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-muted">หมวด *</span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNewCategoryOpen(true)}
                  className="flex h-11 items-center gap-1 rounded-input px-2 text-[12px] font-semibold text-brand-hover focus-visible:outline-none focus-visible:shadow-focus md:h-8"
                >
                  <Icon name="add" className="text-[16px]" />
                  เพิ่มหมวดใหม่
                </button>
                <a
                  href="/places/categories"
                  className="flex h-11 items-center rounded-input px-2 text-[12px] text-muted underline focus-visible:outline-none focus-visible:shadow-focus md:h-8"
                >
                  จัดการ
                </a>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="หมวด">
              {categories.map((c) => {
                const on = form.category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('category', c.key)}
                    className={cn(
                      'flex h-16 flex-col items-center justify-center gap-1 rounded-item border-[1.5px] text-[11px] text-ink focus-visible:outline-none focus-visible:shadow-focus',
                      on ? 'border-brand bg-brand-soft' : 'border-line-border bg-surface',
                    )}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-[8px] text-[18px]" style={{ background: c.soft, color: c.color }}>
                      <Icon name={c.icon} />
                    </span>
                    <span className="line-clamp-1 px-1">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="แขวง"
                required
                options={PROVINCE_OPTIONS}
                value={form.province}
                aria-invalid={!!errors.province}
                onChange={(e) => {
                  regionTouched.current = true;
                  setRegionNote('');
                  set('province', e.target.value);
                }}
              />
              <Input
                label="เมือง"
                placeholder="เช่น เมืองวังเวียง"
                value={form.district}
                onChange={(e) => {
                  regionTouched.current = true;
                  setRegionNote('');
                  set('district', e.target.value);
                }}
              />
            </div>
            {errors.province && (
              <span role="alert" className="text-[12px] text-danger-text">
                {errors.province}
              </span>
            )}
            {regionNote && (
              <span className="flex items-center gap-1 text-[12px] text-muted">
                <Icon name="my_location" className="text-[14px] text-brand" />
                {regionNote}
              </span>
            )}
          </div>
        </Card>

        <Card className="flex flex-col gap-4 p-4">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[12px] font-medium text-muted">
              พิกัด * <span className="font-normal text-label">· คลิกบนแผนที่เพื่อปักหมุด</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label="ละติจูด" placeholder="ละติจูด" inputMode="decimal" className="tabular-nums" invalid={!!errors.coord} value={form.lat} onChange={(e) => set('lat', e.target.value)} />
              <Input aria-label="ลองจิจูด" placeholder="ลองจิจูด" inputMode="decimal" className="tabular-nums" invalid={!!errors.coord} value={form.lng} onChange={(e) => set('lng', e.target.value)} />
            </div>
            <Button variant="soft" icon="my_location" onClick={fillFromGps} disabled={locating} className="mt-1 self-start">
              {locating ? 'กำลังหาตำแหน่ง…' : 'ใช้ตำแหน่งปัจจุบัน (GPS)'}
            </Button>
            {errors.coord && (
              <span role="alert" className="text-[12px] text-danger-text">
                {errors.coord}
              </span>
            )}
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <Input label="เวลาเปิด–ปิด" placeholder="08:00–17:00" value={form.open} onChange={(e) => set('open', e.target.value)} />
            <Input label="ค่าเข้า" placeholder="20,000 กีบ" value={form.fee} onChange={(e) => set('fee', e.target.value)} />
          </div>
          <Input label="เวลาแนะนำ (นาที)" type="number" inputMode="numeric" min={1} value={form.duration} onChange={(e) => set('duration', e.target.value)} error={errors.duration} />
          <Textarea label="รายละเอียด" rows={3} placeholder="ข้อมูลสำหรับไกด์และลูกค้า" value={form.desc} onChange={(e) => set('desc', e.target.value)} />

          <div className="flex flex-col gap-2">
            <span className="text-[12px] font-medium text-muted">รูปภาพ</span>
            {(savedPhotos.length > 0 || newPhotos.length > 0) && (
              <ul className="flex flex-wrap gap-2">
                {savedPhotos.map((url) => (
                  <PhotoThumb key={url} src={url} onRemove={() => setSavedPhotos((l) => l.filter((u) => u !== url))} />
                ))}
                {newPhotos.map((p) => (
                  <PhotoThumb
                    key={p.preview}
                    src={p.preview}
                    onRemove={() => {
                      URL.revokeObjectURL(p.preview);
                      setNewPhotos((l) => l.filter((x) => x !== p));
                    }}
                  />
                ))}
              </ul>
            )}
            <label className="flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 rounded-item border border-dashed border-line-dashsoft px-3 py-4 text-center text-[13px] text-muted hover:bg-bg">
              <Icon name="add_photo_alternate" className="text-[26px] text-brand" />
              {preparing ? 'กำลังเตรียมรูป…' : 'เพิ่มรูปภาพ'}
              <span className="text-[11px] text-label">
                JPG, PNG หรือ WebP ไม่เกิน {PHOTO_MAX_BYTES / 1024 / 1024} MB ต่อรูป · {savedPhotos.length + newPhotos.length}/{PHOTO_MAX_COUNT} รูป · รูปใหญ่จะถูกย่ออัตโนมัติ
              </span>
              <input
                type="file"
                accept={PHOTO_TYPES.join(',')}
                multiple
                disabled={preparing || savedPhotos.length + newPhotos.length >= PHOTO_MAX_COUNT}
                className="sr-only"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            {photoError && (
              <span role="alert" className="text-[12px] text-danger-text">
                {photoError}
              </span>
            )}
          </div>
        </Card>

        {saveError && (
          <p role="alert" className="rounded-item bg-danger-soft px-3.5 py-3 text-[13px] text-danger-text">
            {saveError}
          </p>
        )}
        <div className="flex items-center gap-2">
          {editing && (
            <Button variant="danger" onClick={onDelete} disabled={saving}>
              ลบ
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" href="/places">
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'กำลังบันทึก…' : 'บันทึกสถานที่'}
            </Button>
          </div>
        </div>
      </PanelBody>
    );

  return (
    <PageShell
      wide
      panel={
        <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          {header}
          {body}
        </form>
      }
      map={
        <>
          <MapView
            places={contextPlaces}
            pin={pin}
            fitKey={`${placesStatus}|${loadState}`}
            focus={pin}
            target={target}
            onPick={pick}
            myLocation
          />
          {newCategoryOpen && (
            // อยู่นอก <form> ของฟอร์มสถานที่ (กล่องนี้มีฟอร์มของตัวเอง)
            <CategoryDialog
              open
              initial={null}
              existingLabels={categories.map((c) => c.label)}
              onSave={async (input) => {
                const created = await createCategory(input, Math.max(0, ...categories.map((c) => c.sort)) + 1);
                await reloadCategories();
                set('category', created.key);
                toast(`เพิ่มหมวด “${created.label}” แล้ว`);
                setNewCategoryOpen(false);
              }}
              onClose={() => setNewCategoryOpen(false)}
            />
          )}
          <MapSearch
            className="absolute left-3 top-3 z-[1000] w-[calc(100%-4.75rem)] md:w-[360px]"
            onPickGoogle={(loc) => applyGoogle(loc, false)}
          />
          <div className="pointer-events-none absolute left-4 top-[68px] z-[1000] flex max-w-[calc(100%-5.5rem)] items-center gap-2 rounded-item bg-brand-deep px-3.5 py-2.5 text-[13px] leading-snug text-white shadow-overlay">
            <Icon name="touch_app" className="shrink-0 text-[18px] text-brand-mint" />
            คลิกบนแผนที่เพื่อปักหมุด หรือลากหมุดเพื่อปรับตำแหน่ง
          </div>
        </>
      }
    />
  );
}

function PhotoThumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <li className="relative h-[72px] w-[72px] overflow-hidden rounded-item border border-line-border">
      {/* eslint-disable-next-line @next/next/no-img-element -- blob/Storage URL */}
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="นำรูปออก"
        className="absolute right-0.5 top-0.5 grid h-7 w-7 place-items-center rounded-full bg-brand-deep/80 text-white focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Icon name="close" className="text-[16px]" />
      </button>
    </li>
  );
}
