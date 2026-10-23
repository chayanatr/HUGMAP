'use client';
import type { ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useCollapsed } from '@/lib/useCollapsed';

/**
 * โครงร่วมของหน้า: [panel][map] บน tablet/desktop, แผนที่อยู่บน + panel ด้านล่างบน mobile
 * - desktop ≥1024: panel 400px (form 440px) · tablet 640–1023: panel 340px (form 360px)
 * - mobile <640: แผนที่สูง 300px (สถานที่ 340px) แล้ว scroll ทั้งหน้า
 * - tablet/desktop: ย่อ panel ได้ (ปุ่มลูกศรที่ขอบแผนที่) เพื่อให้แผนที่กว้างขึ้น — จำสถานะไว้ในเบราว์เซอร์
 * ต้องวางใน <main> ของ root layout ที่สูงเต็มจอ
 */
export function PageShell({
  panel,
  map,
  wide = false,
  tallMap = false,
}: {
  panel: ReactNode;
  map: ReactNode;
  /** ฟอร์ม: panel กว้างขึ้น */
  wide?: boolean;
  /** หน้าสถานที่: แผนที่ mobile สูง 340px แทน 300px */
  tallMap?: boolean;
}) {
  const [collapsed, toggle] = useCollapsed('panel');
  return (
    <div className="flex min-h-full flex-col md:h-full md:flex-row">
      <aside
        className={cn(
          'flex flex-col border-line bg-panel md:min-h-0 md:shrink-0 md:border-r',
          collapsed && 'md:hidden',
          wide ? 'md:w-form-tab lg:w-form' : 'md:w-panel-tab lg:w-panel',
        )}
      >
        {panel}
      </aside>
      <div className={cn('relative shrink-0 bg-map max-md:order-first md:min-w-0 md:flex-1', tallMap ? 'h-[340px]' : 'h-[300px]', 'md:h-auto')}>
        {map}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'แสดงแผงรายการ' : 'ย่อแผงรายการ'}
          aria-expanded={!collapsed}
          title={collapsed ? 'แสดงแผงรายการ' : 'ย่อแผงรายการ'}
          className="no-print absolute left-0 top-1/2 z-[1100] hidden h-14 w-6 -translate-y-1/2 place-items-center rounded-r-input bg-surface text-muted shadow-overlay hover:text-ink focus-visible:outline-none focus-visible:shadow-focus md:grid"
        >
          <Icon name={collapsed ? 'chevron_right' : 'chevron_left'} className="text-[20px]" />
        </button>
      </div>
    </div>
  );
}

/** แถบบนของ panel สูง 64px */
export function PanelHeader({ children }: { children: ReactNode }) {
  return <div className="relative z-20 flex h-16 shrink-0 items-center gap-2.5 border-b border-line bg-panel px-4">{children}</div>;
}

/** เนื้อหา panel: padding 16, gap 14, scroll ภายในบน tablet/desktop */
export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  // [&>*]:shrink-0 — ลูกใน flex-col ที่เลื่อนได้ต้องไม่หดตามความสูง (การ์ดที่มี overflow-hidden จะถูกบีบจนเหลือแถบบาง)
  return <div className={cn('flex flex-col gap-3.5 p-4 md:min-h-0 md:flex-1 md:overflow-y-auto [&>*]:shrink-0', className)}>{children}</div>;
}
