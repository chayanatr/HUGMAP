'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Select } from '@/components/ui/Select';
import { useCategories } from '@/components/CategoriesProvider';
import { cn } from '@/lib/cn';
import { PROVINCES } from '@/lib/provinces';
import type { CategoryKey } from '@/lib/types';

const PROVINCE_OPTIONS = [{ value: '', label: 'ทุกแขวง' }, ...PROVINCES.map((p) => ({ value: p.key, label: p.label }))];

export function PlaceFilters({
  province,
  cats,
  count,
  onProvince,
  onCats,
}: {
  province: string;
  cats: CategoryKey[];
  count: number;
  onProvince: (v: string) => void;
  onCats: (v: CategoryKey[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { list: categories } = useCategories();
  const active = cats.length > 0;
  const toggle = (k: CategoryKey) => onCats(cats.includes(k) ? cats.filter((x) => x !== k) : [...cats, k]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Select variant="pill" aria-label="แขวง" value={province} onChange={(e) => onProvince(e.target.value)} options={PROVINCE_OPTIONS} />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex h-11 items-center gap-1 rounded-input px-3 text-[13px] focus-visible:outline-none focus-visible:shadow-focus md:h-9',
            active ? 'bg-brand-soft font-medium text-brand-hover' : 'border border-line-border bg-surface text-ink',
          )}
        >
          หมวด: {active ? cats.length : 'ทั้งหมด'}
          <Icon name={open ? 'expand_less' : 'expand_more'} className="text-[16px]" />
        </button>
        <span className="ml-auto text-[13px] tabular-nums text-muted">{count} แห่ง</span>
      </div>
      {open && (
        <Card className="flex flex-col gap-3 p-3">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = cats.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.key)}
                  className={cn(
                    'flex h-11 items-center gap-1.5 rounded-[9px] border px-2.5 text-[13px] text-ink focus-visible:outline-none focus-visible:shadow-focus md:h-[34px]',
                    on ? 'border-brand bg-brand-soft' : 'border-line-border bg-surface',
                  )}
                >
                  <span className="grid" style={{ color: c.color }}>
                    <Icon name={c.icon} className="text-[16px]" />
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>
          {active && (
            <div>
              <Button variant="soft" onClick={() => onCats([])}>
                ล้างตัวกรอง
              </Button>
            </div>
          )}
        </Card>
      )}
    </>
  );
}
