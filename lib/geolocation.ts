export interface Fix {
  lat: number;
  lng: number;
  /** รัศมีความคลาดเคลื่อน (เมตร) */
  accuracy: number;
}

export type GeoErrorKind = 'unsupported' | 'insecure' | 'denied' | 'unavailable' | 'timeout';
export class GeoError extends Error {
  constructor(public kind: GeoErrorKind) {
    super(kind);
  }
}

const MESSAGES: Record<GeoErrorKind, string> = {
  unsupported: 'เบราว์เซอร์นี้ไม่รองรับการหาตำแหน่ง',
  insecure: 'หาตำแหน่งได้เฉพาะเมื่อเปิดผ่าน HTTPS',
  denied: 'ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง กรุณาเปิดสิทธิ์ตำแหน่งของเว็บไซต์นี้ในเบราว์เซอร์',
  unavailable: 'หาตำแหน่งของคุณไม่ได้ ลองเปิด GPS แล้วลองอีกครั้ง',
  timeout: 'หาตำแหน่งนานเกินไป ลองไปที่โล่งหรือเปิด GPS แล้วลองอีกครั้ง',
};
export const geoErrorMessage = (e: unknown) => MESSAGES[e instanceof GeoError ? e.kind : 'unavailable'];

/** ข้อความสรุปผล พร้อมเตือนเมื่อความแม่นยำต่ำ (เช่น อุปกรณ์ไม่มี GPS ได้แค่ตำแหน่งจาก Wi-Fi/IP) */
export function fixMessage(fix: Fix) {
  const m = Math.round(fix.accuracy);
  return fix.accuracy > 100 ? `ได้ตำแหน่งแล้ว แต่ความแม่นยำต่ำ (± ${m} ม.) อุปกรณ์นี้อาจไม่มี GPS` : `ได้ตำแหน่งของคุณแล้ว (± ${m} ม.)`;
}

/**
 * หาตำแหน่งด้วย GPS (enableHighAccuracy) — พิกัดแรกของ GPS มักคลาดเคลื่อนมาก จึงรับพิกัดต่อเนื่องสั้น ๆ
 * แล้วใช้ค่าที่แม่นที่สุด หยุดทันทีเมื่อคลาดเคลื่อนไม่เกิน goodEnoughM เมตร หรือครบ maxWaitMs
 * ตำแหน่งใช้ในเบราว์เซอร์เท่านั้น ไม่ถูกส่งหรือบันทึกที่ไหน
 */
export function getMyPosition({ goodEnoughM = 30, maxWaitMs = 12000 } = {}): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return reject(new GeoError('unsupported'));
    if (!window.isSecureContext) return reject(new GeoError('insecure'));

    let best: Fix | null = null;
    let done = false;
    let watchId = 0;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      settle();
    };

    watchId = navigator.geolocation.watchPosition(
      (p) => {
        const fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        if (!best || fix.accuracy < best.accuracy) best = fix;
        if (fix.accuracy <= goodEnoughM) finish(() => resolve(fix));
      },
      (err) => finish(() => (best ? resolve(best) : reject(new GeoError(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable')))),
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWaitMs },
    );
    timer = setTimeout(() => finish(() => (best ? resolve(best) : reject(new GeoError('timeout')))), maxWaitMs);
  });
}
