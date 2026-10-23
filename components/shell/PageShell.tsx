'use client';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useCollapsed } from '@/lib/useCollapsed';

type Snap = 'peek' | 'half' | 'full';
const PEEK_PX = 92; // แถบจับ 28 + หัว panel 64
const SNAP_ORDER: Snap[] = ['peek', 'half', 'full'];

/**
 * โครงร่วมของหน้า: [panel][map]
 * - tablet/desktop (≥640): panel ซ้าย (400px/340px, ฟอร์ม 440/360) + แผนที่ — ย่อ panel ได้ด้วยแท็บที่ขอบแผนที่ (จำสถานะไว้)
 * - mobile (<640) สไตล์ Google Maps: แผนที่เต็มพื้นที่ และ panel เป็น bottom sheet ที่ลากขึ้น-ลงได้ 3 ระดับ (ย่อ/ครึ่ง/เต็ม) หรือแตะแถบจับเพื่อสลับ
 * ต้องวางใน <main> ของ root layout ที่สูงเต็มจอ
 */
export function PageShell({
  panel,
  map,
  wide = false,
  mobileSnap = 'half',
  collapseKey = null,
}: {
  panel: ReactNode;
  map: ReactNode;
  /** ฟอร์ม: panel กว้างขึ้น (tablet/desktop) */
  wide?: boolean;
  /** ระดับเริ่มต้นของ bottom sheet บนมือถือ */
  mobileSnap?: Snap;
  /** ค่านี้เปลี่ยนเป็นค่าที่ไม่ว่าง → ย่อ bottom sheet ลงเหลือแถบหัว (เช่น เลือกสถานที่แล้วต้องเห็นแผนที่และการ์ด) */
  collapseKey?: string | null;
  /** (เลิกใช้แล้ว — แผนที่มือถือเต็มพื้นที่) */
  tallMap?: boolean;
}) {
  const [collapsed, toggle] = useCollapsed('panel');
  const root = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const [snap, setSnap] = useState<Snap>(mobileSnap);
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<{ startY: number; startOffset: number; moved: boolean; last: number } | null>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => setH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // เปิดแอนิเมชันหลังวัดความสูงครั้งแรก กัน sheet เลื่อนเข้ามาตอนโหลดหน้า
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (h <= 0) return;
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, [h > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (collapseKey) setSnap('peek');
  }, [collapseKey]);

  const sheetH = Math.max(0, h - 8); // เว้นขอบบน 8px เมื่อดึงเต็ม
  const visible: Record<Snap, number> = { peek: PEEK_PX, half: Math.round(h * 0.5), full: sheetH };
  const offsetOf = (s: Snap) => Math.max(0, sheetH - visible[s]);
  const y = drag ?? offsetOf(snap);
  const next = (s: Snap): Snap => (s === 'full' ? 'peek' : SNAP_ORDER[SNAP_ORDER.indexOf(s) + 1]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { startY: e.clientY, startOffset: offsetOf(snap), moved: false, last: offsetOf(snap) };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dy = e.clientY - g.startY;
    if (Math.abs(dy) > 6) g.moved = true;
    if (g.moved) {
      g.last = Math.min(offsetOf('peek'), Math.max(0, g.startOffset + dy));
      setDrag(g.last);
    }
  };
  const onUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (!g.moved) {
      setSnap(next); // แตะ = ขยายทีละระดับ (เต็มแล้วย่อกลับ)
    } else {
      setSnap(SNAP_ORDER.reduce((best, s) => (Math.abs(offsetOf(s) - g.last) < Math.abs(offsetOf(best) - g.last) ? s : best), snap));
    }
    setDrag(null);
  };

  const sheetStyle = { '--sheet-h': `${sheetH}px`, '--sheet-y': `${y}px` } as CSSProperties;

  return (
    <div ref={root} className="relative h-full overflow-hidden md:flex md:flex-row">
      <aside
        style={sheetStyle}
        className={cn(
          'flex flex-col border-line bg-panel',
          // mobile: bottom sheet
          'max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:z-[1050] max-md:rounded-t-[20px] max-md:border-t max-md:shadow-dropdown max-md:[height:var(--sheet-h)] max-md:[transform:translateY(var(--sheet-y))]',
          drag == null && animate && 'max-md:transition-transform max-md:duration-200',
          // tablet/desktop: panel ซ้าย
          'md:min-h-0 md:shrink-0 md:border-r',
          wide ? 'md:w-form-tab lg:w-form' : 'md:w-panel-tab lg:w-panel',
          collapsed && 'md:hidden',
        )}
      >
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          role="button"
          tabIndex={0}
          aria-label="ลากหรือแตะเพื่อขยาย/ย่อรายการ"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSnap(next);
            }
          }}
          className="flex h-7 shrink-0 cursor-grab touch-none items-center justify-center focus-visible:outline-none focus-visible:shadow-focus md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-line-dash" />
        </div>
        {panel}
      </aside>
      <div className="bg-map max-md:absolute max-md:inset-0 md:relative md:min-w-0 md:flex-1">
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

/** เนื้อหา panel: padding 16, gap 14, เลื่อนภายใน panel (mobile = ภายใน bottom sheet) */
export function PanelBody({ children, className }: { children: ReactNode; className?: string }) {
  // [&>*]:shrink-0 — ลูกใน flex-col ที่เลื่อนได้ต้องไม่หดตามความสูง (การ์ดที่มี overflow-hidden จะถูกบีบจนเหลือแถบบาง)
  return <div className={cn('flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4 [&>*]:shrink-0', className)}>{children}</div>;
}
