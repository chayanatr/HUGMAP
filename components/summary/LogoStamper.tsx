'use client';
// ประทับโลโก้ HUGLAO ตัวจริงลงบนภาพที่ได้จาก ChatGPT (AI วาดโลโก้ให้ตรงไม่ได้) — ประมวลผลในเบราว์เซอร์ ภาพไม่ถูกส่งไปที่ใด
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

const LOGO_SRC = '/brand/huglao-logo.png';
const MAX_SIDE = 4096; // ภาพใหญ่กว่านี้ย่อก่อน กัน canvas ใหญ่เกินที่เบราว์เซอร์รองรับ

type Pos = 'top' | 'top-left' | 'bottom' | 'bottom-right';
const POSITIONS: { key: Pos; label: string }[] = [
  { key: 'top', label: 'บนกลาง' },
  { key: 'top-left', label: 'บนซ้าย' },
  { key: 'bottom', label: 'ล่างกลาง' },
  { key: 'bottom-right', label: 'ล่างขวา' },
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('load failed'));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function LogoStamper() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [pos, setPos] = useState<Pos>('top');
  const [sizePct, setSizePct] = useState(24); // ความกว้างโลโก้ เป็น % ของความกว้างภาพ
  const [plate, setPlate] = useState(true); // แผ่นรองสีขาว: โลโก้เป็นเส้นเขียวเข้ม/ทอง ต้องอ่านชัดบนทุกภาพ
  const [error, setError] = useState('');

  useEffect(() => {
    loadImage(LOGO_SRC).then(setLogo).catch(() => setError('โหลดโลโก้ไม่สำเร็จ'));
  }, []);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) return setError('กรุณาเลือกไฟล์รูปภาพ');
    const url = URL.createObjectURL(file);
    try {
      setPhoto(await loadImage(url));
      setFileName(file.name.replace(/\.[^.]+$/, ''));
    } catch {
      setError('เปิดไฟล์รูปไม่ได้');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !photo || !logo) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(photo.naturalWidth, photo.naturalHeight));
    const W = Math.round(photo.naturalWidth * scale);
    const H = Math.round(photo.naturalHeight * scale);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(photo, 0, 0, W, H);

    const lw = Math.round((W * sizePct) / 100);
    const lh = Math.round((lw * logo.naturalHeight) / logo.naturalWidth);
    const pad = Math.round(lw * 0.1);
    const margin = Math.round(W * 0.04);
    const bw = lw + pad * 2;
    const bh = lh + pad * 2;
    const x = pos === 'top' || pos === 'bottom' ? Math.round((W - bw) / 2) : pos === 'top-left' ? margin : W - bw - margin;
    const y = pos === 'top' || pos === 'top-left' ? margin : H - bh - margin;
    if (plate) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.25)';
      ctx.shadowBlur = Math.round(lw * 0.08);
      ctx.fillStyle = '#fff';
      roundRect(ctx, x, y, bw, bh, Math.round(lw * 0.12));
      ctx.fill();
      ctx.restore();
    }
    ctx.drawImage(logo, x + pad, y + pad, lw, lh);
  }, [photo, logo, pos, sizePct, plate]);

  function download() {
    canvasRef.current?.toBlob(
      (blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName || 'huglao-promo'}-huglao.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      },
      'image/png',
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-item border border-line-border p-3">
      <div>
        <h3 className="text-[14px] font-semibold">ใส่โลโก้ HUGLAO บนภาพที่ได้จาก ChatGPT</h3>
        <p className="mt-0.5 text-[12px] leading-[1.6] text-muted">
          บันทึกภาพจาก ChatGPT แล้วเลือกไฟล์ที่นี่ ระบบวางโลโก้ HUGLAO ตัวจริงให้ตรงตำแหน่งที่เว้นไว้ แล้วดาวน์โหลดภาพสำเร็จรูป (ประมวลผลในเครื่องคุณ ไม่อัปโหลดภาพ)
        </p>
      </div>
      <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-input border border-dashed border-line-dashsoft px-3 text-[13px] text-muted hover:bg-bg">
        <Icon name="add_photo_alternate" className="text-[20px] text-brand" />
        {photo ? `เปลี่ยนภาพ (${fileName})` : 'เลือกภาพที่ได้จาก ChatGPT'}
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {error && (
        <p role="alert" className="text-[12px] text-danger-text">
          {error}
        </p>
      )}
      {photo && (
        <>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ตำแหน่งโลโก้">
            {POSITIONS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={pos === p.key}
                onClick={() => setPos(p.key)}
                className={cn(
                  'h-11 rounded-input px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:shadow-focus md:h-9',
                  pos === p.key ? 'bg-brand text-white' : 'bg-bg text-ink hover:bg-line',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex min-w-[200px] flex-1 items-center gap-2 text-[13px] text-muted">
              ขนาดโลโก้
              <input type="range" min={10} max={45} value={sizePct} onChange={(e) => setSizePct(+e.target.value)} className="h-11 flex-1 accent-brand" />
              <span className="w-9 text-right tabular-nums">{sizePct}%</span>
            </label>
            <label className="flex min-h-[44px] items-center gap-2 text-[13px] text-muted">
              <input type="checkbox" checked={plate} onChange={(e) => setPlate(e.target.checked)} className="h-5 w-5 accent-brand" />
              แผ่นรองสีขาวหลังโลโก้
            </label>
          </div>
          <canvas ref={canvasRef} className="max-h-[360px] w-full rounded-item bg-bg object-contain" aria-label="ตัวอย่างภาพที่ใส่โลโก้" />
          <Button icon="download" onClick={download} className="self-start">
            ดาวน์โหลดภาพที่ใส่โลโก้ (PNG)
          </Button>
        </>
      )}
    </div>
  );
}
