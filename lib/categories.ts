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
export const CATEGORY_ICON_GROUPS: { label: string; icons: string[] }[] = [
  { label: 'ทั่วไป', icons: ['place', 'pin_drop', 'location_on', 'star', 'favorite', 'flag', 'bookmark', 'push_pin', 'info', 'help', 'verified', 'sell'] },
  {
    label: 'อาหาร/เครื่องดื่ม',
    icons: [
      'restaurant', 'local_cafe', 'local_bar', 'local_pizza', 'ramen_dining', 'lunch_dining', 'bakery_dining', 'icecream', 'cake', 'liquor',
      'wine_bar', 'sports_bar', 'coffee', 'fastfood', 'set_meal', 'egg_alt', 'nightlife', 'kitchen',
    ],
  },
  { label: 'ที่พัก', icons: ['hotel', 'bed', 'house', 'cottage', 'villa', 'apartment', 'holiday_village', 'camping', 'night_shelter', 'hot_tub', 'pool', 'room_service'] },
  {
    label: 'ธรรมชาติ/กิจกรรมกลางแจ้ง',
    icons: [
      'water', 'waterfall_chart', 'landscape', 'terrain', 'park', 'forest', 'nature', 'nature_people', 'filter_hdr', 'sunny',
      'wb_twilight', 'beach_access', 'hiking', 'kayaking', 'surfing', 'sailing', 'scuba_diving', 'downhill_skiing', 'sports_handball', 'pets',
      'cruelty_free', 'flutter_dash', 'grass', 'local_florist', 'volcano', 'rainy',
    ],
  },
  {
    label: 'วัฒนธรรม/ประวัติศาสตร์',
    icons: ['temple_buddhist', 'temple_hindu', 'church', 'mosque', 'synagogue', 'castle', 'fort', 'museum', 'account_balance', 'history_edu', 'palette', 'brush', 'theater_comedy', 'festival', 'celebration', 'attractions', 'monument', 'stadium'],
  },
  {
    label: 'ชอปปิง/บริการ',
    icons: ['storefront', 'store', 'local_mall', 'shopping_bag', 'shopping_cart', 'redeem', 'local_grocery_store', 'checkroom', 'diamond', 'local_florist', 'spa', 'content_cut', 'local_laundry_service', 'local_pharmacy', 'local_atm', 'currency_exchange', 'payments', 'local_post_office'],
  },
  {
    label: 'เดินทาง/ขนส่ง',
    icons: [
      'flight', 'flight_takeoff', 'train', 'subway', 'directions_bus', 'directions_car', 'local_taxi', 'two_wheeler', 'pedal_bike', 'directions_boat',
      'directions_walk', 'local_gas_station', 'ev_station', 'local_parking', 'airport_shuttle', 'rv_hookup', 'sailing', 'traffic', 'luggage', 'commute',
    ],
  },
  {
    label: 'สุขภาพ/ความปลอดภัย',
    icons: ['local_hospital', 'medical_services', 'health_and_safety', 'emergency', 'local_police', 'local_fire_department', 'wc', 'accessible', 'child_care', 'self_improvement', 'fitness_center', 'sports_golf'],
  },
  {
    label: 'บันเทิง/อื่น ๆ',
    icons: ['photo_camera', 'camera_alt', 'music_note', 'headphones', 'sports_esports', 'casino', 'movie', 'confirmation_number', 'school', 'work', 'business', 'wifi', 'phone_in_talk', 'info', 'sports_soccer', 'sports_basketball', 'pool', 'golf_course'],
  },
];

export const CATEGORY_ICONS = [...new Set(CATEGORY_ICON_GROUPS.flatMap((g) => g.icons))];

/** สีให้เลือก (hue ของ oklch) */
export const CATEGORY_HUES = [25, 45, 75, 110, 155, 185, 215, 260, 295, 320, 355, 0];

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
