'use client';
import { useCallback, useEffect, useState } from 'react';

/** สถานะย่อ/ขยายของแถบเมนูและการ์ดลอย — จำไว้ในเบราว์เซอร์ของผู้ใช้ (ไม่ส่งไปที่เซิร์ฟเวอร์); เริ่มที่ "ขยาย" เสมอเพื่อไม่ให้หน้าเว็บกระพริบ */
export function useCollapsed(key: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(`hugmap:collapsed:${key}`) === '1');
    } catch {
      // อ่านไม่ได้ (โหมดส่วนตัว/ปิด storage) = ใช้ค่าเริ่มต้น
    }
  }, [key]);

  const toggle = useCallback(() => {
    setCollapsed((cur) => {
      const next = !cur;
      try {
        localStorage.setItem(`hugmap:collapsed:${key}`, next ? '1' : '0');
      } catch {
        // เก็บไม่ได้ = ใช้ได้ในหน้านี้เท่านั้น
      }
      return next;
    });
  }, [key]);

  return [collapsed, toggle];
}
