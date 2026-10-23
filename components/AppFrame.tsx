'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppNav } from '@/components/AppNav';
import { cn } from '@/lib/cn';
import { useCollapsed } from '@/lib/useCollapsed';

/** โครงแอปของพนักงาน (rail + bottom nav) — หน้าเข้าสู่ระบบและลิงก์ลูกค้า /share/* ไม่มีเมนู; rail (tablet/desktop) และแถบเมนูล่าง (mobile) ย่อได้ */
export function AppFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [railCollapsed, toggleRail] = useCollapsed('rail');
  const [bottomHidden, toggleBottom] = useCollapsed('bottomnav');
  if (path === '/login' || path === '/reset-password' || path.startsWith('/share/')) return <main className="min-h-dvh">{children}</main>;
  return (
    <div className="flex h-dvh print:h-auto">
      <AppNav railCollapsed={railCollapsed} onToggleRail={toggleRail} bottomHidden={bottomHidden} onToggleBottom={toggleBottom} />
      <main className={cn('relative min-h-0 min-w-0 flex-1 overflow-auto md:pb-0 print:overflow-visible', !bottomHidden && 'pb-[68px]')}>{children}</main>
    </div>
  );
}
