'use client';
// นำเข้าสถานที่หลายแห่งพร้อมกัน /places/import — เฉพาะ admin (middleware)
// วางรายชื่อ (บรรทัดละแห่ง) → Google Text Search หาพิกัด/ที่อยู่/แขวง → ตรวจ/แก้ → เพิ่มที่เลือกทั้งหมด
import { useMemo, useRef, useState } from 'react';
import { useCategories } from '@/components/CategoriesProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { LAO_BOUNDS } from '@/lib/categories';
import { haversineKm } from '@/lib/geo';
import { createPlace } from '@/lib/places';
import { PROVINCES, guessProvince, regionText } from '@/lib/provinces';
import { ALL_RECOMMENDED_NAMES } from '@/lib/recommendedPlaces';
import { guessCategoryFromGoogle, searchPlaceByText, type PickedLocation } from '@/lib/placesSearch';
import { usePlaces } from '@/lib/usePlaces';
import { useGoogleReady } from '@/lib/useGoogleReady';
import { cn } from '@/lib/cn';

const GAP_MS = 3600; // Text Search มีโควตาต่อนาที (≈16 ครั้ง/นาที) — เว้นช่วงกัน 429
const MAX_LINES = 80;

interface Row {
  id: number;
  query: string;
  status: 'pending' | 'found' | 'missing' | 'error';
  name: string;
  address: string;
  lat: number;
  lng: number;
  province: string;
  district: string;
  category: string;
  estimated: boolean;
  dupOf: string | null;
  outside: boolean;
  checked: boolean;
}

const PROVINCE_OPTIONS = PROVINCES.map((p) => ({ value: p.key, label: p.label }));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ImportPlacesPage() {
  const toast = useToast();
  const ready = useGoogleReady();
  const { list: categories } = useCategories();
  const { places, reload } = usePlaces();
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const stop = useRef(false);

  const lines = useMemo(() => Array.from(new Set(text.split('\n').map((l) => l.trim()).filter(Boolean))).slice(0, MAX_LINES), [text]);
  const catOptions = categories.map((c) => ({ value: c.key, label: c.label }));
  const fallbackCat = categories.find((c) => c.key === 'view')?.key ?? categories[0]?.key ?? 'temple';

  const patch = (id: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  function dupOf(name: string, lat: number, lng: number) {
    const n = name.trim().toLowerCase();
    const hit = places.find((p) => p.name.trim().toLowerCase() === n || haversineKm(p, { lat, lng }) <= 0.15);
    return hit?.name ?? null;
  }

  function toRow(id: number, query: string, loc: PickedLocation | null, failed = false): Row {
    if (!loc)
      return { id, query, status: failed ? 'error' : 'missing', name: query, address: '', lat: 0, lng: 0, province: '', district: '', category: fallbackCat, estimated: false, dupOf: null, outside: false, checked: false };
    const guessed = guessCategoryFromGoogle(loc.types);
    const outside = loc.lat < LAO_BOUNDS.latMin || loc.lat > LAO_BOUNDS.latMax || loc.lng < LAO_BOUNDS.lngMin || loc.lng > LAO_BOUNDS.lngMax;
    const dup = dupOf(loc.name, loc.lat, loc.lng);
    return {
      id,
      query,
      status: 'found',
      name: loc.name || query,
      address: loc.address,
      lat: loc.lat,
      lng: loc.lng,
      province: loc.province ?? guessProvince(loc),
      district: loc.district ?? '',
      category: guessed && categories.some((c) => c.key === guessed) ? guessed : fallbackCat,
      estimated: !loc.province,
      dupOf: dup,
      outside,
      checked: !dup && !outside,
    };
  }

  async function search() {
    if (searching || !lines.length) return;
    stop.current = false;
    setSearching(true);
    setRows([]);
    setProgress(0);
    for (let i = 0; i < lines.length; i++) {
      if (stop.current) break;
      let row: Row;
      try {
        let loc: PickedLocation | null;
        try {
          loc = await searchPlaceByText(`${lines[i]} Laos`);
        } catch (e) {
          // 429 ชนโควตาต่อนาที → รอแล้วลองอีกครั้ง
          await sleep(20000);
          loc = await searchPlaceByText(`${lines[i]} Laos`);
        }
        row = toRow(i, lines[i], loc);
      } catch {
        row = toRow(i, lines[i], null, true);
      }
      setRows((rs) => [...rs, row]);
      setProgress(i + 1);
      if (i < lines.length - 1) await sleep(GAP_MS);
    }
    setSearching(false);
  }

  const selected = rows.filter((r) => r.checked && r.status === 'found' && r.name.trim() && r.province);

  async function addSelected() {
    if (saving || !selected.length) return;
    setSaving(true);
    let ok = 0;
    for (const r of selected) {
      try {
        await createPlace({
          name: r.name.trim(),
          category: r.category,
          province: r.province,
          district: r.district.trim() || null,
          lat: r.lat,
          lng: r.lng,
          open_hours: null,
          fee: null,
          duration_min: 60,
          description: r.address || null,
          photos: [],
        });
        ok++;
        patch(r.id, { checked: false, dupOf: r.name });
      } catch {
        patch(r.id, { status: 'error' });
      }
    }
    await reload();
    setSaving(false);
    toast(ok === selected.length ? `เพิ่ม ${ok} สถานที่แล้ว` : `เพิ่มได้ ${ok} จาก ${selected.length} แห่ง บางรายการไม่สำเร็จ`, ok === selected.length ? 'success' : 'error');
  }

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-4 p-4 pb-28 md:p-7 md:pb-7">
      <div className="flex items-center gap-3">
        <IconButton icon="arrow_back" label="กลับ" href="/places" />
        <h1 className="text-h2">นำเข้าสถานที่แนะนำ</h1>
      </div>
      <p className="text-[13px] leading-[1.6] text-muted">
        วางชื่อสถานที่ (บรรทัดละแห่ง) แล้วกด “ค้นหา” ระบบให้ Google Maps หาพิกัด ที่อยู่ แขวง และเดาหมวดให้ ตรวจแก้แล้วเลือกเพิ่มทีเดียวหลายแห่ง
        สถานที่ที่ซ้ำกับที่มีอยู่ (ชื่อเดียวกัน หรืออยู่ห่างไม่เกิน 150 ม.) จะไม่ถูกเลือกให้
      </p>

      <Card className="flex flex-col gap-3 p-4">
        <Textarea
          label={`รายชื่อสถานที่ (${lines.length}/${MAX_LINES})`}
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Tham Chang Cave Vang Vieng\nBlue Lagoon 1 Vang Vieng\nWat Phou Champasak'}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="soft" icon="auto_awesome" onClick={() => setText(ALL_RECOMMENDED_NAMES.join('\n'))} disabled={searching}>
            ใช้รายการแนะนำทั่ว สปป.ลาว ({ALL_RECOMMENDED_NAMES.length} แห่ง)
          </Button>
          {searching ? (
            <Button variant="outline" icon="stop" onClick={() => (stop.current = true)}>
              หยุด ({progress}/{lines.length})
            </Button>
          ) : (
            <Button icon="travel_explore" onClick={search} disabled={!ready || !lines.length}>
              ค้นหา
            </Button>
          )}
        </div>
        <p className="text-[12px] leading-[1.6] text-placeholder">
          ค้นหาประมาณ 16 แห่งต่อนาที (ตามโควตา Google) รายการแนะนำทั้งหมดใช้เวลาราว {Math.ceil((ALL_RECOMMENDED_NAMES.length * GAP_MS) / 60000)} นาที ปล่อยหน้านี้เปิดไว้ระหว่างค้นหา
          {!ready && ' · กำลังโหลดแผนที่…'}
        </p>
      </Card>

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className={cn('flex flex-col gap-2.5 p-3.5', r.status !== 'found' && 'bg-panel')}>
                {r.status !== 'found' ? (
                  <div className="flex items-center gap-2 text-[14px]">
                    <Icon name={r.status === 'error' ? 'error' : 'search_off'} className="text-[20px] text-danger-text" />
                    <span className="min-w-0 flex-1 truncate">{r.query}</span>
                    <span className="shrink-0 text-[12px] text-danger-text">{r.status === 'error' ? 'ค้นหาไม่สำเร็จ' : 'ไม่พบ'}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        aria-label={`เลือก ${r.name}`}
                        checked={r.checked}
                        disabled={r.outside}
                        onChange={(e) => patch(r.id, { checked: e.target.checked })}
                        className="mt-3 h-5 w-5 shrink-0 accent-brand"
                      />
                      <div className="min-w-0 flex-1">
                        <Input aria-label="ชื่อสถานที่" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} />
                        <div className="mt-1 text-[12px] leading-[1.5] text-muted">{r.address}</div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`ดู ${r.name} ใน Google Maps`}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-input border border-line-border text-brand focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        <Icon name="open_in_new" className="text-[20px]" />
                      </a>
                    </div>
                    <div className="grid grid-cols-1 gap-2 pl-[30px] sm:grid-cols-3">
                      <Select aria-label="หมวด" options={catOptions} value={r.category} onChange={(e) => patch(r.id, { category: e.target.value })} />
                      <Select aria-label="แขวง" options={PROVINCE_OPTIONS} value={r.province} onChange={(e) => patch(r.id, { province: e.target.value, estimated: false })} />
                      <Input aria-label="เมือง" placeholder="เมือง" value={r.district} onChange={(e) => patch(r.id, { district: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pl-[30px] text-[12px]">
                      <span className="text-muted">{regionText({ province: r.province, district: r.district })}</span>
                      {r.estimated && <span className="text-danger-text">แขวงเดาจากตำแหน่ง ตรวจสอบ</span>}
                      {r.dupOf && <span className="text-danger-text">ซ้ำ/ใกล้กับ “{r.dupOf}” ที่มีอยู่แล้ว</span>}
                      {r.outside && <span className="text-danger-text">อยู่นอก สปป.ลาว เพิ่มไม่ได้</span>}
                    </div>
                  </>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-[68px] z-[900] flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:static md:z-auto md:border-0 md:bg-transparent md:p-0">
          <span className="text-[13px] text-muted">เลือกแล้ว {selected.length} แห่ง</span>
          <Button className="ml-auto" icon="add_location_alt" onClick={addSelected} disabled={saving || searching || !selected.length}>
            {saving ? 'กำลังเพิ่ม…' : `เพิ่ม ${selected.length} สถานที่`}
          </Button>
        </div>
      )}
    </div>
  );
}
