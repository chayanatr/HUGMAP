'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppNav } from '@/components/AppNav';

/** โครงแอปของพนักงาน (rail + bottom nav) — หน้าเข้าสู่ระบบและลิงก์ลูกค้า /share/* ไม่มีเมนู */
export function AppFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path === '/login' || path.startsWith('/share/')) return <main className="min-h-dvh">{children}</main>;
  return (
    <div className="flex h-dvh print:h-auto">
      <AppNav />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-auto pb-[68px] md:pb-0 print:overflow-visible">{children}</main>
    </div>
  );
}
