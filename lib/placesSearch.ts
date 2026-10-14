// ค้นหาชื่อสถานที่บน Google Maps (Places API (New) ผ่าน Maps JS API) — ต้องเปิด "Places API (New)" ในโปรเจกต์ Google Cloud
// ค่าใช้จ่าย: Autocomplete ที่จบด้วย fetchFields ใน session เดียวกันคิดเป็นรายการเดียว; ผู้เรียกต้อง debounce และกรองข้อความสั้นเอง

/** ขอบเขตที่ให้ผลค้นหา "เอนเอียง" มาทาง สปป.ลาว (ไม่จำกัด — ยังค้นสถานที่นอกลาวได้) */
const LAOS_BIAS = { west: 100.0, north: 22.5, east: 107.7, south: 13.9 };

export interface PickedLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
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

async function fetchLocation(place: google.maps.places.Place): Promise<PickedLocation> {
  await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
  if (!place.location) throw new Error('no location');
  return { name: place.displayName ?? '', address: place.formattedAddress ?? '', lat: place.location.lat(), lng: place.location.lng() };
}

/** ตำแหน่ง/ชื่อ/ที่อยู่ของผลที่เลือกจากรายการค้นหา */
export const resolveSuggestion = (s: Suggestion) => fetchLocation(s.prediction.toPlace());

/** ชื่อ/ที่อยู่ของสถานที่ที่ผู้ใช้กดบนแผนที่ (Google POI) */
export async function resolvePlaceId(placeId: string): Promise<PickedLocation> {
  const { Place } = await lib();
  return fetchLocation(new Place({ id: placeId, requestedLanguage: 'th' }));
}
