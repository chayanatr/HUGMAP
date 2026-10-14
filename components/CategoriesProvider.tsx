'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BUILTIN_CATEGORIES, UNKNOWN_CATEGORY, toCategoryDef, type CategoryDef, type CategoryRow } from '@/lib/categories';
import { fetchCategories } from '@/lib/categoriesApi';

interface CategoriesValue {
  /** หมวดทั้งหมดเรียงตามลำดับ */
  list: CategoryDef[];
  /** หมวดของสถานที่ — หมวดที่หาไม่เจอคืน "ไม่ระบุหมวด" */
  cat: (key: string | null | undefined) => CategoryDef;
  reload: () => Promise<void>;
}

const initial = BUILTIN_CATEGORIES.map(toCategoryDef);
const Ctx = createContext<CategoriesValue>({ list: initial, cat: (k) => initial.find((c) => c.key === k) ?? UNKNOWN_CATEGORY, reload: async () => {} });

/** โหลดหมวดจากฐานข้อมูลครั้งเดียวต่อหน้า (อ่านได้ทุกคน รวมหน้าลิงก์ลูกค้า); ระหว่างรอใช้หมวดเริ่มต้น */
export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<CategoryRow[]>(BUILTIN_CATEGORIES);

  const reload = useCallback(async () => {
    try {
      const data = await fetchCategories();
      if (data.length) setRows(data);
    } catch {
      // โหลดไม่ได้ = ใช้หมวดเริ่มต้นต่อไป
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo<CategoriesValue>(() => {
    const list = rows.map(toCategoryDef);
    const byKey = new Map(list.map((c) => [c.key, c]));
    return { list, cat: (k) => (k ? byKey.get(k) : undefined) ?? UNKNOWN_CATEGORY, reload };
  }, [rows, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCategories = () => useContext(Ctx);
