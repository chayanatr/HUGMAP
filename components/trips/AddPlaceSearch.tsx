'use client';
import { useMemo, useState } from 'react';
import { SearchField } from '@/components/shell/SearchField';
import { CategoryTile } from '@/components/places/PlaceCard';
import { Icon } from '@/components/ui/Icon';
import { useCategories } from '@/components/CategoriesProvider';
import { CITY_LABEL } from '@/lib/categories';
import type { Place } from '@/lib/types';

const MAX_RESULTS = 6;

/** ช่องค้นหาเพื่อเพิ่มสถานที่ + dropdown ผลลัพธ์ ≤6 รายการ (วางใน PanelHeader ซึ่งเป็น relative) */
export function AddPlaceSearch({ places, excludeIds, onAdd }: { places: Place[]; excludeIds: Set<string>; onAdd: (p: Place) => void }) {
  const { cat } = useCategories();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return places.filter((p) => !excludeIds.has(p.id) && p.name.toLowerCase().includes(needle)).slice(0, MAX_RESULTS);
  }, [q, places, excludeIds]);

  const add = (p: Place) => {
    onAdd(p);
    setQ('');
    setOpen(false);
  };

  return (
    <>
      <SearchField
        label="ค้นหาสถานที่เพื่อเพิ่ม"
        placeholder="ค้นหาสถานที่เพื่อเพิ่ม…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) add(results[0]);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim() && (
        <ul
          role="listbox"
          aria-label="ผลการค้นหาสถานที่"
          className="absolute inset-x-3 top-[calc(100%-6px)] z-[1100] flex flex-col overflow-hidden rounded-card bg-surface p-1.5 shadow-dropdown"
        >
          {results.length === 0 && <li className="px-3 py-3 text-[13px] text-muted">ไม่พบสถานที่ที่ไม่ได้อยู่ในวันนี้</li>}
          {results.map((p) => (
            <li key={p.id} role="option" aria-selected={false}>
              {/* onMouseDown กัน input เสีย focus ก่อนคลิกสำเร็จ */}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(p)}
                className="flex min-h-11 w-full items-center gap-3 rounded-input px-2 py-1.5 text-left hover:bg-bg focus-visible:outline-none focus-visible:shadow-focus"
              >
                <CategoryTile category={p.category} size={36} iconPx={18} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{p.name}</span>
                  <span className="block text-label">
                    {cat(p.category).label} · {CITY_LABEL[p.city]}
                  </span>
                </span>
                <Icon name="add_circle" className="text-[22px] text-brand" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
