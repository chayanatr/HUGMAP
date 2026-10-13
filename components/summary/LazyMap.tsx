'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type Pt = { id?: string; lat: number; lng: number; name: string; category?: import('@/lib/types').CategoryKey };

/**
 * แผนที่ของแต่ละวัน — สร้างเมื่อเลื่อนมาใกล้จอ เพื่อลดจำนวนครั้งที่โหลดแผนที่ (คิดค่าใช้จ่ายต่อครั้ง)
 * และสร้างทั้งหมดทันทีก่อนพิมพ์ เพื่อไม่ให้แผนที่ที่ยังไม่เคยเลื่อนผ่านหายจาก PDF
 */
export function LazyMap({ stops, nearby, routeLine, fitKey }: { stops: Pt[]; nearby: Pt[]; routeLine?: [number, number][] | null; fitKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    const beforePrint = () => setShow(true);
    window.addEventListener('beforeprint', beforePrint);
    return () => {
      io.disconnect();
      window.removeEventListener('beforeprint', beforePrint);
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {show && <MapView stops={stops} nearby={nearby} routeLine={routeLine ?? undefined} fitKey={fitKey} />}
    </div>
  );
}
