'use client';
import { useEffect, useState } from 'react';

/** รอ Maps JS API (โหลดโดย <MapProvider>) — ไม่มี API key = false ตลอด (ใช้ค่าประมาณแทน Google Routes) */
export function useGoogleReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return;
    const id = setInterval(() => {
      if (typeof google !== 'undefined' && google.maps) {
        setReady(true);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, []);
  return ready;
}
