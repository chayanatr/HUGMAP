'use client';
// สรุปเส้นทาง (พนักงาน) /trips/[id]/summary — id = 'current' คือทริปล่าสุด; ?r=<กม.> กำหนดรัศมีแนะนำใกล้เส้นทาง
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SummaryView } from '@/components/summary/SummaryView';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { RADIUS_OPTIONS_KM } from '@/lib/categories';
import { useTripSummary } from '@/lib/useTripSummary';
import { usePlaces } from '@/lib/usePlaces';

export default function TripSummaryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [radiusKm, setRadiusKm] = useState(1);
  const { places, status: placesStatus } = usePlaces();
  const { status, reload, data, routing, actions } = useTripSummary(params.id, places, placesStatus === 'ready', radiusKm, toast);

  useEffect(() => {
    const r = Number(new URLSearchParams(window.location.search).get('r'));
    if (RADIUS_OPTIONS_KM.includes(r)) setRadiusKm(r);
  }, []);

  // /trips/current/summary แต่ยังไม่มีทริปเลย → ไปหน้ารายการทริปเพื่อสร้าง
  useEffect(() => {
    if (params.id === 'current' && status === 'missing') router.replace('/trips');
  }, [params.id, status, router]);

  if (data) {
    return (
      <SummaryView
        data={data}
        mode="staff"
        routing={routing}
        onCopyLink={actions.copyShareLink}
        onRevokeLink={() => {
          if (window.confirm('ยกเลิกลิงก์ลูกค้าของทริปนี้?\nลูกค้าที่มีลิงก์เดิมจะเปิดดูไม่ได้อีก (กด "คัดลอกลิงก์ลูกค้า" เพื่อสร้างลิงก์ใหม่ได้ภายหลัง)')) actions.revokeShareLink();
        }}
        onAddNearby={(dayId, hit, at) => actions.addToDay(dayId, hit.place, at)}
      />
    );
  }

  const failed = status === 'error' || status === 'missing' || placesStatus === 'error';
  return (
    <div className="mx-auto max-w-[1120px] p-4 md:p-7">
      <Card className="flex flex-col items-start gap-3 p-4">
        <p className="text-[14px] leading-[1.6] text-muted" role={failed ? 'alert' : undefined}>
          {status === 'missing' ? 'ไม่พบทริปนี้ อาจถูกลบไปแล้ว' : failed ? 'โหลดข้อมูลสรุปไม่สำเร็จ' : 'กำลังโหลดสรุปเส้นทาง…'}
        </p>
        {failed && status !== 'missing' && (
          <Button variant="outline" icon="refresh" onClick={reload}>
            ลองอีกครั้ง
          </Button>
        )}
        {status === 'missing' && (
          <Button variant="outline" href="/trips">
            ไปที่ทริปทั้งหมด
          </Button>
        )}
      </Card>
    </div>
  );
}
