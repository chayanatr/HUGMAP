'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const TOAST_MS = 2400;
const ERROR_TOAST_MS = 4200; // ข้อความผิดพลาดยาวกว่า ต้องมีเวลาอ่าน
type Tone = 'success' | 'error';
type Show = (message: string, tone?: Tone) => void;
const ToastContext = createContext<Show>(() => {});

/** แสดง toast ด้านล่างกลาง — const toast = useToast(); toast('บันทึกแล้ว') หรือ toast('ไม่สำเร็จ', 'error') */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback<Show>((message, tone = 'success') => {
    setToast({ message, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? ERROR_TOAST_MS : TOAST_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-[84px] z-[1000] flex justify-center px-4 md:bottom-7">
        {toast && (
          <div className="flex max-w-[480px] items-center gap-2 rounded-item bg-brand-deep px-4 py-3 text-[14px] leading-[1.5] text-white shadow-dark">
            {toast.tone === 'error' ? (
              <Icon name="error" className="shrink-0 text-[20px] text-danger" />
            ) : (
              <Icon name="check_circle" className="shrink-0 text-[20px] text-brand" />
            )}
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
