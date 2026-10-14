'use client';
// ตั้งรหัสผ่านใหม่ /reset-password — ปลายทางของลิงก์ในอีเมลรีเซ็ตรหัสผ่านของ Supabase Auth
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PasswordForm } from '@/components/auth/PasswordForm';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

const WAIT_MS = 4000; // รอให้ Supabase อ่านโทเคนจากลิงก์ก่อนสรุปว่าลิงก์ใช้ไม่ได้

export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<'checking' | 'ready' | 'invalid'>('checking');

  useEffect(() => {
    const db = supabase();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data: sub } = db.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) setState('ready');
    });

    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (hash.get('error') || hash.get('error_code')) return setState('invalid'); // ลิงก์หมดอายุ/ถูกใช้แล้ว
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        if (error) return setState('invalid');
      }
      const { data } = await db.auth.getSession();
      if (data.session) setState('ready');
      else timer = setTimeout(() => setState((s) => (s === 'checking' ? 'invalid' : s)), WAIT_MS);
    })();

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-section bg-surface p-6 shadow-card">
        <div className="flex flex-col items-center gap-1 text-center">
          <Image src="/brand/huglao-logo.png" alt="HUGLAO" width={560} height={528} priority unoptimized className="h-[96px] w-auto" />
          <div className="text-[13px] font-bold tracking-[.08em] text-brand-hover">HUGMAP</div>
        </div>
        <h1 className="text-h2">ตั้งรหัสผ่านใหม่</h1>
        {state === 'checking' && <p className="text-[14px] text-muted">กำลังตรวจสอบลิงก์…</p>}
        {state === 'invalid' && (
          <>
            <p role="alert" className="rounded-item bg-danger-soft px-3.5 py-3 text-[13px] leading-[1.6] text-danger-text">
              ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง
            </p>
            <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-input bg-brand text-[14px] font-semibold text-white hover:bg-brand-hover focus-visible:outline-none focus-visible:shadow-focus">
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </>
        )}
        {state === 'ready' && (
          <PasswordForm
            submitLabel="บันทึกรหัสผ่านใหม่"
            onDone={() => {
              toast('เปลี่ยนรหัสผ่านแล้ว');
              router.replace('/places');
              router.refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}
