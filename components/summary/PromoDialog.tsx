'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LogoStamper } from '@/components/summary/LogoStamper';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PROMO_FORMATS, buildPromoPrompt, type PromoFormat } from '@/lib/promoPrompt';
import type { SummaryData } from '@/lib/summary';

const CHATGPT_URL = 'https://chatgpt.com/';

/** ส่งทริปไปสร้างภาพโปรโมท/ภาพนำเสนอใน ChatGPT: เลือกรูปแบบ → คัดลอกพรอมต์ที่มีตารางเวลา → เปิด ChatGPT แล้ววาง */
export function PromoDialog({ data, open, onClose }: { data: SummaryData; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [format, setFormat] = useState<PromoFormat>('poster');
  const prompt = useMemo(() => buildPromoPrompt(data, format), [data, format]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function copy(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(prompt);
      return true;
    } catch {
      window.prompt('คัดลอกพรอมต์นี้ไปวางใน ChatGPT', prompt);
      return false;
    }
  }

  async function openChatGpt() {
    const ok = await copy();
    window.open(CHATGPT_URL, '_blank', 'noopener,noreferrer');
    if (ok) toast('คัดลอกพรอมต์แล้ว วางในช่องข้อความของ ChatGPT ได้เลย');
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto max-h-[92vh] w-[min(94vw,620px)] overflow-y-auto rounded-section bg-surface p-0 text-ink shadow-dropdown backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 text-h2">สร้างภาพโปรโมทด้วย ChatGPT</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="-mr-2 -mt-2 grid h-11 w-11 place-items-center rounded-input text-muted hover:text-ink focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>
        <p className="text-[13px] leading-[1.6] text-muted">
          เลือกรูปแบบภาพ ระบบจะเตรียมพรอมต์ที่มีตารางเวลาของทริปนี้ให้ กดเปิด ChatGPT แล้ววางพรอมต์ ChatGPT จะสร้างภาพให้ (ต้องใช้บัญชี ChatGPT ที่สร้างภาพได้ของคุณเอง)
        </p>

        <div role="radiogroup" aria-label="รูปแบบภาพ" className="grid gap-2 sm:grid-cols-3">
          {PROMO_FORMATS.map((f) => {
            const on = f.key === format;
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setFormat(f.key)}
                className={cn(
                  'flex min-h-[72px] flex-col items-start gap-0.5 rounded-item border-[1.5px] p-3 text-left focus-visible:outline-none focus-visible:shadow-focus',
                  on ? 'border-brand bg-brand-soft' : 'border-line-border bg-surface hover:bg-bg',
                )}
              >
                <span className="text-[14px] font-semibold">{f.label}</span>
                <span className="text-[12px] leading-[1.5] text-muted">{f.hint}</span>
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-muted">พรอมต์ที่จะส่งให้ ChatGPT (ไม่รวมชื่อลูกค้า รหัสทริป และลิงก์)</span>
          <textarea readOnly value={prompt} rows={9} className="w-full rounded-input border border-line-border bg-panel p-3 text-[13px] leading-[1.6] text-ink outline-none focus:border-brand focus:shadow-focus" />
        </label>

        <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-[1.6] text-muted">
          <li>กด “คัดลอกและเปิด ChatGPT” แล้ววางพรอมต์ในช่องข้อความ (พรอมต์สั่งให้เว้นที่ว่างด้านบนกลางภาพไว้สำหรับโลโก้)</li>
          <li>ตรวจชื่อสถานที่และเวลาในภาพทุกตัวอักษรก่อนส่งลูกค้า เพราะ AI อาจสะกดผิด ถ้าผิดให้พิมพ์สั่งแก้</li>
          <li>บันทึกภาพ แล้วใส่โลโก้ HUGLAO ตัวจริงด้วยเครื่องมือด้านล่าง (ทางเลือก: แนบไฟล์โลโก้ให้ ChatGPT วางเองก็ได้ แต่ AI อาจวาดโลโก้เพี้ยน)</li>
        </ol>

        <div className="flex flex-wrap items-center gap-2">
          <Button icon="open_in_new" onClick={openChatGpt}>
            คัดลอกและเปิด ChatGPT
          </Button>
          <Button variant="outline" icon="content_copy" onClick={async () => (await copy()) && toast('คัดลอกพรอมต์แล้ว')}>
            คัดลอกพรอมต์
          </Button>
          <a
            href="/brand/huglao-logo.png"
            download="HUGLAO-logo.png"
            className="inline-flex h-11 items-center gap-1.5 rounded-input border border-line-border bg-surface px-4 text-[14px] text-ink hover:bg-bg focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Icon name="download" className="text-[18px]" />
            ดาวน์โหลดโลโก้
          </a>
        </div>

        <LogoStamper />
      </div>
    </dialog>
  );
}
