import { regionFromComponents } from './geocode';

// ค้นหาชื่อสถานที่บน Google Maps (Places API (New) ผ่าน Maps JS API) — ต้องเปิด "Places API (New)" ในโปรเจกต์ Google Cloud
// ค่าใช้จ่าย: Autocomplete ที่จบด้วย fetchFields ใน session เดียวกันคิดเป็นรายการเดียว; ผู้เรียกต้อง debounce และกรองข้อความสั้นเอง

/** ขอบเขตที่ให้ผลค้นหา "เอนเอียง" มาทาง สปป.ลาว (ไม่จำกัด — ยังค้นสถานที่นอกลาวได้) */
const LAOS_BIAS = { west: 100.0, north: 22.5, east: 107.7, south: 13.9 };

export interface PickedLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** แขวง (key ใน lib/provinces.ts) และเมืองจากที่อยู่ของ Google — null = Google ไม่ระบุ */
  province: string | null;
  district: string | null;
  /** primaryType + types ของ Google (เช่น restaurant, buddhist_temple) ใช้เดาหมวดตอนเพิ่มสถานที่ */
  types: string[];
}

/** เดา key ของหมวดมาตรฐานจากชนิดสถานที่ของ Google (null = ไม่แน่ใจ — ปล่อยให้ผู้ใช้เลือกเอง) */
export function guessCategoryFromGoogle(types: string[]): string | null {
  const has = (...names: string[]) => types.some((t) => names.includes(t));
  const ends = (suffix: string) => types.some((t) => t.endsWith(suffix));
  if (has('lodging', 'hotel', 'guest_house', 'hostel', 'resort_hotel', 'bed_and_breakfast', 'motel', 'inn', 'cottage')) return 'stay';
  if (has('cafe', 'coffee_shop', 'bakery', 'tea_house', 'dessert_shop', 'ice_cream_shop')) return 'cafe';
  if (has('restaurant', 'food', 'bar', 'meal_takeaway', 'meal_delivery') || ends('_restaurant')) return 'food';
  if (has('buddhist_temple', 'hindu_temple', 'place_of_worship', 'church', 'mosque', 'synagogue')) return 'temple';
  if (has('museum', 'art_gallery', 'history_museum')) return 'museum';
  if (has('airport', 'international_airport', 'train_station', 'bus_station', 'transit_station', 'border_crossing', 'ferry_terminal')) return 'transport';
  if (has('gift_shop')) return 'gift';
  if (has('market', 'farmers_market', 'supermarket', 'shopping_mall', 'night_market')) return 'market';
  if (has('park', 'national_park', 'natural_feature', 'campground', 'hiking_area', 'waterfall', 'garden')) return 'nature';
  if (has('observation_deck', 'scenic_spot', 'viewpoint')) return 'view';
  return null;
}

export interface Suggestion {
  placeId: string;
  main: string;
  secondary: string;
  /** ใช้ resolve() เพื่อให้ session token เดียวกับ Autocomplete (คิดเงินเป็น session เดียว) */
  prediction: google.maps.places.PlacePrediction;
}

async function lib() {
  return (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
}

export async function newSessionToken() {
  return new (await lib()).AutocompleteSessionToken();
}

export async function suggest(input: string, sessionToken: google.maps.places.AutocompleteSessionToken): Promise<Suggestion[]> {
  const { AutocompleteSuggestion } = await lib();
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input,
    sessionToken,
    language: 'th',
    region: 'la',
    locationBias: LAOS_BIAS,
  });
  return suggestions.flatMap((s) =>
    s.placePrediction
      ? [
          {
            placeId: s.placePrediction.placeId,
            main: s.placePrediction.mainText?.text ?? s.placePrediction.text.text,
            secondary: s.placePrediction.secondaryText?.text ?? '',
            prediction: s.placePrediction,
          },
        ]
      : [],
  );
}

const PLACE_FIELDS = ['displayName', 'formattedAddress', 'location', 'primaryType', 'types', 'addressComponents'];

function toPicked(place: google.maps.places.Place): PickedLocation {
  if (!place.location) throw new Error('no location');
  const { province, district } = regionFromComponents((place.addressComponents ?? []).map((c) => ({ name: c.longText ?? '', types: c.types })));
  return {
    name: place.displayName ?? '',
    address: place.formattedAddress ?? '',
    lat: place.location.lat(),
    lng: place.location.lng(),
    province,
    district,
    types: [...(place.primaryType ? [place.primaryType] : []), ...(place.types ?? [])],
  };
}

async function fetchLocation(place: google.maps.places.Place): Promise<PickedLocation> {
  await place.fetchFields({ fields: PLACE_FIELDS });
  return toPicked(place);
}

/** ค้นหาด้วยชื่อ (Text Search) คืนผลแรก — ใช้นำเข้าสถานที่หลายแห่งพร้อมกัน; null = ไม่พบ */
export async function searchPlaceByText(query: string): Promise<PickedLocation | null> {
  const { Place } = await lib();
  const { places } = await Place.searchByText({
    textQuery: query,
    fields: PLACE_FIELDS,
    maxResultCount: 1,
    language: 'th',
    region: 'la',
    locationBias: LAOS_BIAS,
  });
  return places?.[0] ? toPicked(places[0]) : null;
}

/** ตำแหน่ง/ชื่อ/ที่อยู่ของผลที่เลือกจากรายการค้นหา */
export const resolveSuggestion = (s: Suggestion) => fetchLocation(s.prediction.toPlace());

/** ชื่อ/ที่อยู่ของสถานที่ที่ผู้ใช้กดบนแผนที่ (Google POI) */
export async function resolvePlaceId(placeId: string): Promise<PickedLocation> {
  const { Place } = await lib();
  return fetchLocation(new Place({ id: placeId, requestedLanguage: 'th' }));
}
