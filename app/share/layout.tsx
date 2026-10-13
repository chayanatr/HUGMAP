import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MapProvider } from '@/components/MapProvider';

// ลิงก์ลูกค้าเป็นข้อมูลส่วนตัวของทริป — ห้ามให้เสิร์ชเอนจินเก็บ
export const metadata: Metadata = { title: 'สรุปเส้นทาง · HUGMAP', robots: { index: false, follow: false } };

export default function ShareLayout({ children }: { children: ReactNode }) {
  return <MapProvider>{children}</MapProvider>;
}
