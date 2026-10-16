// หาแขวง/เมืองจากพิกัด: ใช้ Google Geocoding (ต้องเปิด Geocoding API และอนุญาตใน key) ถ้าใช้ไม่ได้ → เดาจากเมืองหลักที่ใกล้ที่สุด
import { guessProvince, matchProvince } from './provinces';

export interface Region {
  province: string;
  district: string | null;
  /** true = เดาจากตำแหน่ง (ไม่ใช่ข้อมูลจากแผนที่) — ให้ผู้ใช้ตรวจสอบ */
  estimated: boolean;
}

let geocodingDenied = false; // Geocoding API ยังไม่เปิด/ไม่อนุญาต → ไม่เรียกซ้ำจนกว่าจะรีโหลดหน้า

type Component = { long_name: string; types: string[] };

/** ดึง province/district จากส่วนประกอบที่อยู่ของ Google (Geocoder: administrative_area_level_1 = แขวง, level_2/locality = เมือง) */
export function regionFromComponents(components: { name: string; types: string[] }[]): { province: string | null; district: string | null } {
  const byType = (t: string) => components.find((c) => c.types.includes(t))?.name ?? null;
  const province = matchProvince(byType('administrative_area_level_1'));
  const district = byType('administrative_area_level_2') ?? byType('locality') ?? byType('sublocality_level_1');
  return { province, district };
}

export async function resolveRegion(lat: number, lng: number): Promise<Region> {
  if (!geocodingDenied && typeof google !== 'undefined' && google.maps) {
    try {
      const { Geocoder } = (await google.maps.importLibrary('geocoding')) as google.maps.GeocodingLibrary;
      const { results } = await new Geocoder().geocode({ location: { lat, lng }, language: 'th' });
      const comps: Component[] = results?.[0]?.address_components ?? [];
      const { province, district } = regionFromComponents(comps.map((c) => ({ name: c.long_name, types: c.types })));
      if (province) return { province, district, estimated: false };
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'REQUEST_DENIED') geocodingDenied = true;
    }
  }
  return { province: guessProvince({ lat, lng }), district: null, estimated: true };
}
