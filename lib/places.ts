import { supabase } from './supabase';
import type { CategoryKey, Place } from './types';

const BUCKET = 'place-photos';
export const PLACE_COLUMNS = 'id,name,category,province,district,lat,lng,open_hours,fee,duration_min,description,photos';
const COLUMNS = PLACE_COLUMNS;

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PHOTO_MAX_COUNT = 5;

export interface PlaceInput {
  name: string;
  category: CategoryKey;
  province: string;
  district: string | null;
  lat: number;
  lng: number;
  open_hours: string | null;
  fee: string | null;
  duration_min: number;
  description: string | null;
  photos: string[];
}

const toRow = (p: PlaceInput) => ({
  name: p.name,
  category: p.category,
  province: p.province,
  district: p.district,
  location: `SRID=4326;POINT(${p.lng} ${p.lat})`,
  open_hours: p.open_hours,
  fee: p.fee,
  duration_min: p.duration_min,
  description: p.description,
  photos: p.photos,
});

export async function fetchPlaces(): Promise<Place[]> {
  const { data, error } = await supabase().from('places').select(COLUMNS).order('name');
  if (error) throw error;
  return data as Place[];
}

export async function fetchPlace(id: string): Promise<Place | null> {
  const { data, error } = await supabase().from('places').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Place | null;
}

export async function createPlace(input: PlaceInput) {
  const { error } = await supabase().from('places').insert(toRow(input));
  if (error) throw error;
}

export async function updatePlace(id: string, input: PlaceInput) {
  const { error } = await supabase()
    .from('places')
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePlace(id: string) {
  const { error } = await supabase().from('places').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadPlacePhoto(file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase().storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** ลบรูปจาก Storage ตาม public URL (ไม่ throw — ใช้เก็บกวาดหลังบันทึกพลาด/ลบรูปเดิม) */
export async function removePlacePhotos(urls: string[]) {
  const marker = `/${BUCKET}/`;
  const paths = urls.map((u) => u.split(marker)[1]).filter(Boolean);
  if (paths.length) await supabase().storage.from(BUCKET).remove(paths);
}
