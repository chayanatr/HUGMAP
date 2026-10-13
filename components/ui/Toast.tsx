'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const TOAST_MS = 2400;
const ToastContext = createContext<(message: string) => void>(() => {});

/** แสดง toast ด้านล่างกลาง 2.4 วินาที — ใช้ const toast = useToast(); toast('บันทึกแล้ว') */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((m: string) => {
    setMessage(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), TOAST_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-[84px] z-[1000] flex justify-center px-4 md:bottom-7">
        {message && (
          <div className="flex items-center gap-2 rounded-item bg-brand-deep px-4 py-3 text-[14px] text-white shadow-dark">
            <Icon name="check_circle" className="text-[20px] text-brand" />
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
