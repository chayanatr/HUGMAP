import type { CategoryKey, CityKey } from './types';

const hue: Record<CategoryKey, number> = { temple: 75, cafe: 45, food: 25, stay: 320, nature: 155, market: 355, view: 215, museum: 260, gift: 110 };

export const CATEGORIES: { key: CategoryKey; label: string; icon: string; color: string; ink: string; soft: string }[] = (
  [
    ['temple', 'วัด', 'temple_buddhist'], ['cafe', 'คาเฟ่', 'local_cafe'], ['food', 'ร้านอาหาร', 'restaurant'],
    ['stay', 'ที่พัก', 'hotel'], ['nature', 'น้ำตก/ธรรมชาติ', 'water'], ['market', 'ตลาด', 'storefront'],
    ['view', 'จุดชมวิว', 'landscape'], ['museum', 'พิพิธภัณฑ์', 'museum'], ['gift', 'ร้านของฝาก', 'redeem'],
  ] as [CategoryKey, string, string][]
).map(([key, label, icon]) => ({ key, label, icon, color: `oklch(0.6 0.12 ${hue[key]})`, ink: `oklch(0.48 0.12 ${hue[key]})`, soft: `oklch(0.95 0.035 ${hue[key]})` }));

export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<CategoryKey, (typeof CATEGORIES)[number]>;

export const CITIES: { key: CityKey; label: string }[] = [
  { key: 'lp', label: 'หลวงพระบาง' }, { key: 'vte', label: 'เวียงจันทน์' }, { key: 'vv', label: 'วังเวียง' },
  { key: 'pakse', label: 'ปากเซ' }, { key: 'other', label: 'อื่น ๆ' },
];

export const CITY_LABEL = Object.fromEntries(CITIES.map((c) => [c.key, c.label])) as Record<CityKey, string>;

export const LAO_BOUNDS = { latMin: 13.9, latMax: 22.5, lngMin: 100.0, lngMax: 107.7 };
export const RADIUS_OPTIONS_KM = [0.5, 1, 2, 3, 5];
