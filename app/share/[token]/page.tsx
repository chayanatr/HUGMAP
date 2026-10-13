// ลิงก์ลูกค้า /share/[token] (อ่านอย่างเดียว) — ดึงข้อมูลฝั่ง server กรองด้วย share_token
import { notFound } from 'next/navigation';
import { SummaryView } from '@/components/summary/SummaryView';
import { fetchSharedSummary } from '@/lib/sharedTrip';

// ข้อมูลทริปเปลี่ยนได้ตลอดและลิงก์ต้องยกเลิกได้ทันที — ห้ามแคชทั้งหน้าและ fetch
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function SharePage({ params }: { params: { token: string } }) {
  const data = await fetchSharedSummary(params.token);
  if (!data) notFound();
  return <SummaryView data={data} mode="client" />;
}
