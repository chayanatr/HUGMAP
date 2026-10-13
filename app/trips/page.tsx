'use client';
// ทริปทั้งหมด /trips — เลือกทริปไปจัดเส้นทาง หรือสร้างทริปใหม่ (ไม่สร้างทริปว่างให้เองอีกแล้ว)
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { fmtThaiRange } from '@/lib/format';
import { createTrip, fetchTrips, type TripListItem } from '@/lib/trips';

export default function TripsPage() {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [items, setItems] = useState<TripListItem[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setItems(await fetchTrips());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function newTrip() {
    if (creating) return;
    setCreating(true);
    try {
      const t = await createTrip();
      toast(`สร้างทริป ${t.code} แล้ว`);
      router.push(`/trips/${t.id}`);
    } catch {
      toast('สร้างทริปใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง', 'error');
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 p-4 pb-24 md:p-7 md:pb-7">
      <div className="flex items-center gap-3">
        <h1 className="text-h2">ทริปทั้งหมด</h1>
        <Button icon="add" className="ml-auto" disabled={creating} onClick={newTrip}>
          สร้างทริปใหม่
        </Button>
      </div>

      {status === 'loading' && <Card className="p-4 text-[14px] text-muted">กำลังโหลดทริป…</Card>}
      {status === 'error' && (
        <Card className="flex flex-col items-start gap-3 p-4">
          <p className="text-[14px] leading-[1.6] text-danger-text" role="alert">
            โหลดรายการทริปไม่สำเร็จ
          </p>
          <Button variant="outline" icon="refresh" onClick={load}>
            ลองอีกครั้ง
          </Button>
        </Card>
      )}
      {status === 'ready' && items.length === 0 && (
        <Card className="flex flex-col items-start gap-3 p-4">
          <p className="text-[14px] leading-[1.6] text-muted">ยังไม่มีทริป กดปุ่ม &ldquo;สร้างทริปใหม่&rdquo; เพื่อเริ่มจัดเส้นทาง</p>
        </Card>
      )}
      {status === 'ready' && items.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map(({ trip, dayCount }, i) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="flex min-h-[44px] flex-col gap-2 rounded-card bg-surface p-4 shadow-card transition-colors hover:bg-bg focus-visible:outline-none focus-visible:shadow-focus"
              >
                <div className="flex items-center gap-2">
                  <span className="text-label">{trip.code}</span>
                  {i === 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-hover">ล่าสุด</span>}
                  {trip.share_token && (
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
                      <Icon name="link" className="text-[14px]" />
                      แชร์ลิงก์แล้ว
                    </span>
                  )}
                  <Icon name="chevron_right" className="ml-auto text-[20px] text-muted" />
                </div>
                <div className="text-title">{trip.name}</div>
                <div className="text-value text-muted">
                  {trip.client_name} · {trip.pax} คน · {dayCount} วัน · {fmtThaiRange(trip.start_date, dayCount)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
