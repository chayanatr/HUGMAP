import type { CategoryRow } from './categories';
import { supabase } from './supabase';

const COLUMNS = 'key,label,icon,hue,sort';

export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase().from('place_categories').select(COLUMNS).order('sort').order('created_at');
  if (error) throw error;
  return data as CategoryRow[];
}

export type CategoryInput = Pick<CategoryRow, 'label' | 'icon' | 'hue'>;

/** สร้างหมวดใหม่ — key สุ่ม (ชื่อไทยทำเป็น key ไม่ได้ และ key ไม่เปลี่ยนเมื่อแก้ชื่อ) */
export async function createCategory(input: CategoryInput, nextSort: number): Promise<CategoryRow> {
  const key = `c_${crypto.randomUUID().replaceAll('-', '').slice(0, 8)}`;
  const { data, error } = await supabase()
    .from('place_categories')
    .insert({ key, label: input.label.trim(), icon: input.icon, hue: input.hue, sort: nextSort })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function updateCategory(key: string, input: CategoryInput) {
  const { error } = await supabase().from('place_categories').update({ label: input.label.trim(), icon: input.icon, hue: input.hue }).eq('key', key);
  if (error) throw error;
}

/** ลบหมวด — ลบไม่ได้ถ้ายังมีสถานที่ใช้อยู่ (FK restrict → 23503) */
export async function deleteCategory(key: string): Promise<'ok' | 'in-use'> {
  const { error } = await supabase().from('place_categories').delete().eq('key', key);
  if (error?.code === '23503') return 'in-use';
  if (error) throw error;
  return 'ok';
}
