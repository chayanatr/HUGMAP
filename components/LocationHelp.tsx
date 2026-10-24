'use client';
// ช่วยผู้ใช้เปิดสิทธิ์ตำแหน่ง (GPS): เว็บไซต์เปิดหน้าตั้งค่าของเบราว์เซอร์ให้เองไม่ได้ จึงแสดงขั้นตอนตามอุปกรณ์ + ปุ่มลองอีกครั้ง/รีโหลด
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { GeoError, geoErrorMessage } from '@/lib/geolocation';

type Platform = 'ios' | 'android' | 'desktop';
type Perm = 'granted' | 'denied' | 'prompt' | 'unknown';

interface LocationHelpValue {
  /** เปิดหน้าต่างวิธีเปิดสิทธิ์ตำแหน่ง; retry = ฟังก์ชันที่เรียกซ้ำเมื่อกด "ลองอีกครั้ง" */
  show: (retry?: () => void) => void;
  /** จัดการข้อผิดพลาดจาก getMyPosition: ถูกปฏิเสธสิทธิ์ → หน้าต่างวิธีเปิดสิทธิ์; อย่างอื่น → toast */
  handleError: (e: unknown, retry?: () => void) => void;
}
const Ctx = createContext<LocationHelpValue>({ show: () => {}, handleError: () => {} });
export const useLocationHelp = () => useContext(Ctx);

const SETTINGS_URL = 'chrome://settings/content/location';

const STEPS: Record<Platform, string[]> = {
  android: [
    'แตะไอคอนตั้งค่า (ซ้ายสุดของช่องที่อยู่เว็บด้านบน) → “การอนุญาต” หรือ “การตั้งค่าไซต์”',
    'เลือก “ตำแหน่ง” แล้วตั้งเป็น “อนุญาต”',
    'ถ้ายังไม่ได้ ให้ปัดแถบด้านบนของเครื่องลงมาเปิด “ตำแหน่ง (Location)” ของเครื่องก่อน',
    'กลับมาที่หน้านี้ กด “ลองอีกครั้ง” (หรือรีโหลดหน้า)',
  ],
  ios: [
    'แตะ “aA” ที่ช่องที่อยู่เว็บ → “การตั้งค่าเว็บไซต์” → “ตำแหน่ง” → เลือก “อนุญาต”',
    'ถ้ายังไม่ได้: ตั้งค่า (Settings) → ความเป็นส่วนตัวและความปลอดภัย → บริการหาตำแหน่ง → เปิด แล้วเลือก Safari Websites → “ขณะใช้แอป”',
    'กลับมาที่หน้านี้ กด “ลองอีกครั้ง” (หรือรีโหลดหน้า)',
  ],
  desktop: [
    'คลิกไอคอนล็อกหรือไอคอนตั้งค่าที่ซ้ายของช่องที่อยู่เว็บ',
    'เลือก “ตำแหน่ง” (Location) แล้วตั้งเป็น “อนุญาต” (Allow)',
    'ถ้าเบราว์เซอร์ขอให้โหลดหน้าใหม่ ให้กดโหลดใหม่ แล้วกด “ลองอีกครั้ง”',
  ],
};

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function LocationHelpProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const retryRef = useRef<(() => void) | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [perm, setPerm] = useState<Perm>('unknown');
  // อ่านชนิดเบราว์เซอร์เฉพาะตอนเปิดหน้าต่าง (ฝั่ง client) — ถ้าอ่านตอนเรนเดอร์ HTML จากเซิร์ฟเวอร์จะไม่ตรงกับเบราว์เซอร์ (hydration error)
  const [chromeLike, setChromeLike] = useState(false);

  const show = useCallback((retry?: () => void) => {
    retryRef.current = retry;
    const p = detectPlatform();
    setPlatform(p);
    setChromeLike(/Chrome|CriOS|Edg/i.test(navigator.userAgent) && p !== 'ios');
    setPerm('unknown');
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((s) => setPerm(s.state as Perm))
      .catch(() => {});
    setOpen(true);
  }, []);

  const handleError = useCallback(
    (e: unknown, retry?: () => void) => {
      if (e instanceof GeoError && e.kind === 'denied') show(retry);
      else toast(geoErrorMessage(e), 'error');
    },
    [show, toast],
  );

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const value = useMemo(() => ({ show, handleError }), [show, handleError]);

  async function copySettingsUrl() {
    try {
      await navigator.clipboard.writeText(SETTINGS_URL);
      toast('คัดลอกแล้ว วางในช่องที่อยู่ของ Chrome แล้วกด Enter เพื่อเปิดหน้าตั้งค่าตำแหน่ง');
    } catch {
      window.prompt('คัดลอกที่อยู่นี้ไปวางในช่องที่อยู่ของ Chrome', SETTINGS_URL);
    }
  }

  return (
    <Ctx.Provider value={value}>
      {children}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        className="m-auto max-h-[92vh] w-[min(94vw,460px)] overflow-y-auto rounded-section bg-surface p-0 text-ink shadow-dropdown backdrop:bg-ink/40 max-md:m-0 max-md:mt-auto max-md:w-full max-md:max-w-none max-md:rounded-b-none"
      >
        <div className="flex flex-col gap-3.5 p-5">
          <div className="flex items-start gap-2">
            <h2 className="flex-1 text-h2">เปิดสิทธิ์ตำแหน่ง (GPS)</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิด"
              className="-mr-2 -mt-2 grid h-11 w-11 place-items-center rounded-input text-muted hover:text-ink focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>
          {perm === 'prompt' ? (
            <p className="text-[14px] leading-[1.6] text-muted">เบราว์เซอร์ยังไม่ได้ถามสิทธิ์ กด “ลองอีกครั้ง” แล้วเลือก “อนุญาต” ในหน้าต่างที่ขึ้นมา</p>
          ) : (
            <>
              <p className="text-[14px] leading-[1.6] text-muted">
                เว็บนี้ถูกปิดสิทธิ์ตำแหน่งไว้ เว็บไซต์เปิดหน้าตั้งค่าของเบราว์เซอร์ให้เองไม่ได้ ทำตามขั้นตอนนี้ (ใช้เวลาไม่ถึงนาที):
              </p>
              <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-[1.6]">
                {STEPS[platform].map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {chromeLike && (
                <Button variant="outline" icon="content_copy" onClick={copySettingsUrl} className="self-start">
                  คัดลอกลิงก์หน้าตั้งค่าตำแหน่งของ Chrome
                </Button>
              )}
            </>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" icon="refresh" onClick={() => window.location.reload()}>
              รีโหลดหน้า
            </Button>
            <Button
              icon="my_location"
              onClick={() => {
                setOpen(false);
                retryRef.current?.();
              }}
            >
              ลองอีกครั้ง
            </Button>
          </div>
        </div>
      </dialog>
    </Ctx.Provider>
  );
}
