import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// ลิงก์ลูกค้าเป็นข้อมูลส่วนตัวของทริป — ห้ามให้เสิร์ชเอนจินเก็บ
export const metadata: Metadata = { title: 'ตารางเดินทาง · HUGLAO', robots: { index: false, follow: false } };

export default function ShareLayout({ children }: { children: ReactNode }) {
  // เอกสารลูกค้าไม่แสดงแผนที่ในหน้า (มีลิงก์เปิด Google Maps แทน) จึงไม่โหลด Maps JavaScript API และไม่นับโควตา map loads
  return <>{children}</>;
}
