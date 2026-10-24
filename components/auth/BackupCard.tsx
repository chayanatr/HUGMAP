'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { buildBackup, downloadFile, lastBackupAt, markBackup, placesCsv, stampName } from '@/lib/backup';
import { parseBackup, RestoreError, restoreBackup } from '@/lib/restore';

const STALE_DAYS = 30;

/** สำรองข้อมูล (ผู้ดูแลเท่านั้น): ดาวน์โหลดไฟล์ JSON ทั้งระบบ หรือ CSV ของสถานที่ */
export function BackupCard() {
  const toast = useToast();
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null);
  const [last, setLast] = useState<Date | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => setLast(lastBackupAt()), []);

  async function run(kind: 'json' | 'csv') {
    if (busy) return;
    setBusy(kind);
    try {
      const b = await buildBackup();
      if (kind === 'json') downloadFile(stampName('hugmap-backup', 'json'), 'application/json', JSON.stringify(b, null, 2));
      else downloadFile(stampName('hugmap-places', 'csv'), 'text/csv', placesCsv(b.places, b.categories));
      markBackup();
      setLast(new Date());
      toast(`ดาวน์โหลดแล้ว · สถานที่ ${b.counts.places} · ทริป ${b.counts.trips} · หมวด ${b.counts.categories}`);
    } catch {
      toast('ส่งออกไม่สำเร็จ กรุณาลองอีกครั้ง', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || restoring) return;
    try {
      const b = parseBackup(await file.text());
      const when = new Date(b.exported_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      const ok = window.confirm(
        `นำเข้าไฟล์สำรองเมื่อ ${when}?\nสถานที่ ${b.counts.places} · ทริป ${b.counts.trips} · หมวด ${b.counts.categories}\n\nระบบจะเพิ่มข้อมูลที่ไม่มี และอัปเดตข้อมูลที่มี id ตรงกัน (ข้อมูลในไฟล์จะทับของเดิม) โดยไม่ลบข้อมูลอื่น`,
      );
      if (!ok) return;
      setRestoring('กำลังเริ่ม…');
      const r = await restoreBackup(b, (label, d, t) => setRestoring(`กำลังนำเข้า${label}… ${d}/${t}`));
      toast(`นำเข้าแล้ว · สถานที่ ${r.places} · ทริป ${r.trips} · หมวด ${r.categories}`);
    } catch (err) {
      toast(err instanceof RestoreError ? err.message : 'นำเข้าไม่สำเร็จ กรุณาลองอีกครั้ง', 'error');
    } finally {
      setRestoring(null);
    }
  }

  const stale = !last || (Date.now() - last.getTime()) / 86_400_000 > STALE_DAYS;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-title">สำรองข้อมูล</h2>
      <p className="text-[13px] leading-[1.6] text-muted">
        ดาวน์โหลดสถานที่ หมวด และทริป (วัน/จุดแวะ) เก็บไว้เป็นไฟล์ในเครื่องหรือ Google Drive รูปภาพเก็บเป็นลิงก์ ไฟล์รูปจริงยังอยู่ในระบบ ไม่รวมลิงก์ลูกค้า
        เส้นทางที่คำนวณไว้ (คำนวณใหม่ได้) และบัญชีผู้ใช้
      </p>
      <p className={stale ? 'text-[13px] font-medium text-warning' : 'text-[13px] text-muted'} role="status">
        {last ? `สำรองล่าสุด ${last.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} บนเบราว์เซอร์นี้` : 'ยังไม่เคยสำรองบนเบราว์เซอร์นี้'}
        {stale && ` — ควรสำรองอย่างน้อยเดือนละครั้ง`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button icon="download" onClick={() => run('json')} disabled={!!busy}>
          {busy === 'json' ? 'กำลังเตรียมไฟล์…' : 'ดาวน์โหลดไฟล์สำรอง (JSON)'}
        </Button>
        <Button variant="outline" icon="table_view" onClick={() => run('csv')} disabled={!!busy}>
          {busy === 'csv' ? 'กำลังเตรียมไฟล์…' : 'สถานที่เป็น CSV (Excel)'}
        </Button>
      </div>
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <h3 className="text-[14px] font-semibold">นำเข้าข้อมูลสำรอง</h3>
        <p className="text-[13px] leading-[1.6] text-muted">
          เลือกไฟล์สำรอง (JSON) ที่ดาวน์โหลดไว้เพื่อนำกลับเข้าระบบ ระบบจะเพิ่ม/อัปเดตข้อมูลตาม id ของแต่ละรายการ และไม่ลบข้อมูลที่มีอยู่ นำเข้าซ้ำได้
        </p>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
        <Button variant="outline" icon="upload" onClick={() => fileRef.current?.click()} disabled={!!busy || !!restoring} className="self-start">
          {restoring ?? 'เลือกไฟล์สำรองเพื่อนำเข้า'}
        </Button>
      </div>
    </Card>
  );
}
