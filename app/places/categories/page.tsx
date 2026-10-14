'use client';
// จัดการหมวดสถานที่ /places/categories — เฉพาะ admin (middleware); เพิ่ม/แก้ไข/ลบหมวด
import { useMemo, useState } from 'react';
import { useCategories } from '@/components/CategoriesProvider';
import { CategoryDialog } from '@/components/places/CategoryDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/components/ui/Toast';
import type { CategoryDef } from '@/lib/categories';
import { createCategory, deleteCategory, updateCategory, type CategoryInput } from '@/lib/categoriesApi';
import { usePlaces } from '@/lib/usePlaces';

export default function CategoriesPage() {
  const toast = useToast();
  const { list, reload } = useCategories();
  const { places } = usePlaces();
  const [dlg, setDlg] = useState<{ cat: CategoryDef | null } | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    places.forEach((p) => m.set(p.category, (m.get(p.category) ?? 0) + 1));
    return m;
  }, [places]);

  const nextSort = Math.max(0, ...list.map((c) => c.sort)) + 1;
  const editing = dlg?.cat ?? null;

  async function save(input: CategoryInput) {
    if (editing) await updateCategory(editing.key, input);
    else await createCategory(input, nextSort);
    await reload();
    toast(editing ? 'บันทึกหมวดแล้ว' : 'เพิ่มหมวดแล้ว');
    setDlg(null);
  }

  async function remove() {
    if (!editing) return;
    const res = await deleteCategory(editing.key);
    if (res === 'in-use') return toast('ลบไม่ได้ ยังมีสถานที่ใช้หมวดนี้อยู่', 'error');
    await reload();
    toast('ลบหมวดแล้ว');
    setDlg(null);
  }

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-4 p-4 pb-24 md:p-7 md:pb-7">
      <div className="flex items-center gap-3">
        <IconButton icon="arrow_back" label="กลับ" href="/places" />
        <h1 className="text-h2">จัดการหมวดสถานที่</h1>
        <Button icon="add" className="ml-auto" onClick={() => setDlg({ cat: null })}>
          เพิ่มหมวด
        </Button>
      </div>
      <p className="text-[13px] leading-[1.6] text-muted">หมวดใช้จัดกลุ่มและกรองสถานที่ ตั้งชื่อ เลือกไอคอนและสีได้เอง การเปลี่ยนชื่อหมวดมีผลกับสถานที่ทั้งหมดที่ใช้หมวดนั้น</p>
      <ul className="flex flex-col gap-2">
        {list.map((c) => (
          <li key={c.key}>
            <Card className="flex items-center gap-3 p-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-item text-[24px]" style={{ background: c.soft, color: c.color }}>
                <Icon name={c.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-title">{c.label}</div>
                <div className="text-label">{counts.get(c.key) ?? 0} สถานที่</div>
              </div>
              <IconButton icon="edit" label={`แก้ไขหมวด ${c.label}`} onClick={() => setDlg({ cat: c })} />
            </Card>
          </li>
        ))}
      </ul>
      {dlg && (
        <CategoryDialog
          open
          initial={editing}
          usedCount={editing ? (counts.get(editing.key) ?? 0) : 0}
          existingLabels={list.filter((c) => c.key !== editing?.key).map((c) => c.label)}
          onSave={save}
          onDelete={editing ? remove : undefined}
          onClose={() => setDlg(null)}
        />
      )}
    </div>
  );
}
