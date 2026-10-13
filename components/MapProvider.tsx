'use client';
import { APIProvider } from '@vis.gl/react-google-maps';
import type { ReactNode } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/** โหลด Google Maps JS API ครั้งเดียวต่อกลุ่มหน้า (places / trips) — ใช้ร่วมกันระหว่าง MapView และการคำนวณเส้นทาง */
export function MapProvider({ children }: { children: ReactNode }) {
  if (!API_KEY) return <>{children}</>;
  return (
    <APIProvider apiKey={API_KEY} language="th" region="LA">
      {children}
    </APIProvider>
  );
}
