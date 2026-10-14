'use client';
// ช่องค้นหาลอยบนแผนที่: สถานที่ที่บันทึกไว้ในระบบ + สถานที่ทั่วไปบน Google Maps (Places API)
// ใช้ใต้ <MapProvider> ผ่าน dynamic import ร่วมกับ MapView
import { useEffect, useId, useRef, useState } from 'react';
import { CAT } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { newSessionToken, resolveSuggestion, suggest, type PickedLocation, type Suggestion } from '@/lib/placesSearch';
import type { Place } from '@/lib/types';
import { useGoogleReady } from '@/lib/useGoogleReady';
import { Icon } from '@/components/ui/Icon';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 350;

export function MapSearch({
  places = [],
  onSelectSaved,
  onPickGoogle,
  request,
  className,
}: {
  /** สถานที่ในระบบที่ค้นหาได้ในช่องเดียวกัน (ไม่ส่ง = ค้นเฉพาะ Google) */
  places?: Place[];
  onSelectSaved?: (place: Place) => void;
  onPickGoogle: (loc: PickedLocation) => void;
  /** สั่งค้นจากภายนอก (เช่น ปุ่มค้นหาบน Google ในรายการสถานที่): ใส่ข้อความ เปิดรายการผล และโฟกัสช่อง; key เปลี่ยนเพื่อสั่งซ้ำ */
  request?: { text: string; key: number } | null;
  className?: string;
}) {
  const ready = useGoogleReady();
  const listId = useId();
  const box = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [resolving, setResolving] = useState(false);

  const needle = q.trim();
  const active = needle.length >= MIN_CHARS;
  const saved = active ? places.filter((p) => p.name.toLowerCase().includes(needle.toLowerCase())).slice(0, 4) : [];

  useEffect(() => {
    if (!ready || !active) {
      setResults([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    const t = setTimeout(async () => {
      try {
        token.current ??= await newSessionToken();
        const list = await suggest(needle, token.current);
        if (cancelled) return;
        setResults(list);
        setStatus('idle');
      } catch (e) {
        console.warn('Places search failed', e);
        if (!cancelled) {
          setResults([]);
          setStatus('error');
        }
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [needle, active, ready]);

  useEffect(() => {
    if (!request) return;
    setQ(request.text);
    setOpen(true);
    inputRef.current?.focus();
  }, [request]);

  useEffect(() => {
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return null;

  async function pickGoogle(s: Suggestion) {
    if (resolving) return;
    setResolving(true);
    try {
      const loc = await resolveSuggestion(s);
      token.current = null; // จบ session: การค้นครั้งถัดไปเริ่ม session ใหม่
      setQ(s.main);
      setOpen(false);
      onPickGoogle({ ...loc, name: loc.name || s.main });
    } catch (e) {
      console.warn('Place details failed', e);
      setStatus('error');
    } finally {
      setResolving(false);
    }
  }

  function pickSaved(p: Place) {
    setQ(p.name);
    setOpen(false);
    onSelectSaved?.(p);
  }

  const showList = open && active;

  return (
    <div ref={box} className={cn('pointer-events-auto relative', className)}>
      <div className="flex items-center gap-2 rounded-input bg-surface px-3 shadow-overlay">
        <Icon name="search" className="text-[20px] text-label" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="ค้นหาชื่อสถานที่บนแผนที่"
          aria-expanded={showList}
          aria-controls={listId}
          autoComplete="off"
          placeholder="ค้นหาชื่อสถานที่…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter') {
              e.preventDefault();
              if (saved[0]) pickSaved(saved[0]);
              else if (results[0]) pickGoogle(results[0]);
            }
          }}
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-placeholder"
        />
      </div>

      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-10 mt-1.5 max-h-[60vh] overflow-y-auto rounded-item bg-surface py-1 shadow-dropdown">
          {saved.length > 0 && <li className="px-3 pb-1 pt-2 text-label">สถานที่ในระบบ</li>}
          {saved.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              <button type="button" onClick={() => pickSaved(p)} className="flex min-h-[44px] w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-bg focus-visible:outline-none focus-visible:shadow-focus">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CAT[p.category].color }} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{p.name}</span>
                <span className="shrink-0 text-label">{CAT[p.category].label}</span>
              </button>
            </li>
          ))}
          <li className="px-3 pb-1 pt-2 text-label">ค้นหาบน Google Maps</li>
          {status === 'loading' && <li className="px-3 py-2 text-[13px] text-muted">กำลังค้นหา…</li>}
          {status === 'error' && (
            <li role="alert" className="px-3 py-2 text-[13px] leading-[1.5] text-danger-text">
              ค้นหาบน Google ไม่สำเร็จ ลองอีกครั้ง หรือแจ้งผู้ดูแลระบบ
            </li>
          )}
          {status === 'idle' && results.length === 0 && <li className="px-3 py-2 text-[13px] text-muted">{ready ? 'ไม่พบผลการค้นหา' : 'กำลังโหลดแผนที่…'}</li>}
          {results.map((s) => (
            <li key={s.placeId} role="option" aria-selected={false}>
              <button
                type="button"
                disabled={resolving}
                onClick={() => pickGoogle(s)}
                className="flex min-h-[44px] w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-bg focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-60"
              >
                <Icon name="location_on" className="shrink-0 text-[18px] text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">{s.main}</span>
                  {s.secondary && <span className="block truncate text-label">{s.secondary}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
