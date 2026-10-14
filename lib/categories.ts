import type { CityKey } from './types';

/** หมวดสถานที่เก็บในตาราง place_categories (ผู้ดูแลเพิ่ม/แก้ไขเองได้); ใช้ผ่าน useCategories() */
export interface CategoryRow {
  key: string;
  label: string;
  icon: string;
  /** 0–360 — สร้างสี oklch เดียวกันทุกหมวด */
  hue: number;
  sort: number;
}

export interface CategoryDef extends CategoryRow {
  color: string;
  ink: string;
  soft: string;
}

export const toCategoryDef = (r: CategoryRow): CategoryDef => ({
  ...r,
  color: `oklch(0.6 0.12 ${r.hue})`,
  ink: `oklch(0.48 0.12 ${r.hue})`,
  soft: `oklch(0.95 0.035 ${r.hue})`,
});

/** หมวดเริ่มต้น (ตรงกับ migration) — ใช้แสดงระหว่างรอโหลดจากฐานข้อมูล และเป็นกลุ่มของตัวกรองใกล้เส้นทาง */
export const BUILTIN_CATEGORIES: CategoryRow[] = [
  { key: 'temple', label: 'วัด', icon: 'temple_buddhist', hue: 75, sort: 1 },
  { key: 'cafe', label: 'คาเฟ่', icon: 'local_cafe', hue: 45, sort: 2 },
  { key: 'food', label: 'ร้านอาหาร', icon: 'restaurant', hue: 25, sort: 3 },
  { key: 'stay', label: 'ที่พัก', icon: 'hotel', hue: 320, sort: 4 },
  { key: 'nature', label: 'น้ำตก/ธรรมชาติ', icon: 'water', hue: 155, sort: 5 },
  { key: 'market', label: 'ตลาด', icon: 'storefront', hue: 355, sort: 6 },
  { key: 'view', label: 'จุดชมวิว', icon: 'landscape', hue: 215, sort: 7 },
  { key: 'museum', label: 'พิพิธภัณฑ์', icon: 'museum', hue: 260, sort: 8 },
  { key: 'gift', label: 'ร้านของฝาก', icon: 'redeem', hue: 110, sort: 9 },
];

/** หมวดที่หาไม่เจอ (เช่น ถูกลบไปแล้ว) */
export const UNKNOWN_CATEGORY: CategoryDef = {
  key: '',
  label: 'ไม่ระบุหมวด',
  icon: 'place',
  hue: 0,
  sort: 999,
  color: 'oklch(0.6 0.02 250)',
  ink: 'oklch(0.48 0.02 250)',
  soft: 'oklch(0.95 0.01 250)',
};

/** ไอคอนให้เลือกตอนสร้างหมวด (ชื่อ Material Symbols Rounded) */
export const CATEGORY_ICONS = [
  'place', 'temple_buddhist', 'restaurant', 'local_cafe', 'hotel', 'water', 'storefront', 'landscape', 'museum', 'redeem',
  'local_bar', 'nightlife', 'spa', 'park', 'forest', 'hiking', 'kayaking', 'directions_boat', 'beach_access', 'attractions',
  'celebration', 'theater_comedy', 'music_note', 'photo_camera', 'castle', 'account_balance', 'church', 'mosque', 'local_mall', 'shopping_bag',
  'local_hospital', 'local_gas_station', 'flight', 'train', 'directions_bus', 'pedal_bike', 'sports_golf', 'fitness_center', 'school', 'pets',
];

/** สีให้เลือก (hue ของ oklch) */
export const CATEGORY_HUES = [25, 45, 75, 110, 155, 185, 215, 260, 295, 320, 355, 0];

export const CITIES: { key: CityKey; label: string }[] = [
  { key: 'lp', label: 'หลวงพระบาง' }, { key: 'vte', label: 'เวียงจันทน์' }, { key: 'vv', label: 'วังเวียง' },
  { key: 'pakse', label: 'ปากเซ' }, { key: 'other', label: 'อื่น ๆ' },
];

export const CITY_LABEL = Object.fromEntries(CITIES.map((c) => [c.key, c.label])) as Record<CityKey, string>;

export const LAO_BOUNDS = { latMin: 13.9, latMax: 22.5, lngMin: 100.0, lngMax: 107.7 };
export const RADIUS_OPTIONS_KM = [0.5, 1, 2, 3, 5];

/** ตัวกรองหมวดของรายการแนะนำใกล้เส้นทาง; 'other' = หมวดที่ไม่อยู่ในกลุ่มด้านบน (รวมหมวดที่ผู้ดูแลเพิ่มเอง) */
export type NearbyFilterKey = 'all' | 'eat' | 'sight' | 'shop' | 'other';
export const NEARBY_FILTERS: { key: NearbyFilterKey; label: string; icon: string; cats: string[] | null }[] = [
  { key: 'all', label: 'ทั้งหมด', icon: 'apps', cats: null },
  { key: 'eat', label: 'ร้านอาหาร/คาเฟ่', icon: 'restaurant', cats: ['food', 'cafe'] },
  { key: 'sight', label: 'ท่องเที่ยว', icon: 'landscape', cats: ['temple', 'nature', 'view', 'museum'] },
  { key: 'shop', label: 'ตลาด/ของฝาก', icon: 'storefront', cats: ['market', 'gift'] },
  { key: 'other', label: 'อื่น ๆ', icon: 'category', cats: null },
];

const GROUPED = new Set(NEARBY_FILTERS.flatMap((f) => f.cats ?? []));
/** หมวด (key) อยู่ในตัวกรองนี้หรือไม่ */
export function matchesNearbyFilter(filter: NearbyFilterKey, category: string) {
  if (filter === 'all') return true;
  if (filter === 'other') return !GROUPED.has(category);
  return NEARBY_FILTERS.find((f) => f.key === filter)?.cats?.includes(category) ?? false;
}
/** มีหมวดนอกกลุ่ม (ควรแสดงชิป "อื่น ๆ") */
export const hasUngrouped = (keys: string[]) => keys.some((k) => !GROUPED.has(k));
