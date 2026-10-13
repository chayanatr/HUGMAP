'use client';
// เข้าสู่ระบบ /login — บัญชีสร้างโดยผู้ดูแลระบบเท่านั้น (ไม่มีสมัครเอง)
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { roleOf } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const noRole = params.get('error') === 'no-role';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // ล็อกอินแล้วแต่ยังไม่ได้รับสิทธิ์ → ออกจากระบบ เพื่อให้ลองบัญชีอื่นได้
  useEffect(() => {
    if (noRole) supabase().auth.signOut();
  }, [noRole]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (!email.trim() || !password) return;
    setBusy(true);
    const { data, error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    if (err || !data.user) {
      setBusy(false);
      return setError(err?.status === 400 ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
    if (!roleOf(data.user)) {
      await supabase().auth.signOut();
      setBusy(false);
      return setError('บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
    }
    router.replace(next?.startsWith('/') ? next : '/places');
    router.refresh();
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex w-full max-w-[400px] flex-col gap-4 rounded-section bg-surface p-6 shadow-card">
      <div className="flex flex-col items-center gap-1 text-center">
        {/* unoptimized: ไฟล์โลโก้ถูกย่อให้พอดีแล้ว เสิร์ฟตรง ๆ ไม่ผ่าน /_next/image (ที่ทำให้รูปโปร่งใสไม่แสดงในการทดสอบ) */}
        <Image src="/brand/huglao-logo.png" alt="HUGLAO" width={560} height={528} priority unoptimized className="h-[132px] w-auto" />
        <div className="text-[13px] font-bold tracking-[.08em] text-brand-hover">HUGMAP</div>
        <div className="text-label">ระบบจัดเส้นทางท่องเที่ยว สปป.ลาว</div>
      </div>
      <h1 className="text-h2">เข้าสู่ระบบ</h1>
      {(noRole || error) && (
        <p role="alert" className="rounded-item bg-danger-soft px-3.5 py-3 text-[13px] leading-[1.6] text-danger-text">
          {error || 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ'}
        </p>
      )}
      <Input label="อีเมล" type="email" autoComplete="username" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={submitted && !email.trim() ? 'กรุณากรอกอีเมล' : ''} />
      <Input label="รหัสผ่าน" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={submitted && !password ? 'กรุณากรอกรหัสผ่าน' : ''} />
      <Button type="submit" disabled={busy} className="!h-12 w-full">
        {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </Button>
      <p className="text-center text-[12px] leading-[1.6] text-placeholder">ยังไม่มีบัญชี? ติดต่อผู้ดูแลระบบของบริษัทเพื่อขอสิทธิ์ใช้งาน</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
