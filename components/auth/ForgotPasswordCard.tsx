'use client';
// รหัสผ่านในหน้าบัญชี (ขั้นตอนมาตรฐาน): "ลืมรหัสผ่าน" → ส่งลิงก์ไปอีเมล → หน้า "ตั้งรหัสผ่านใหม่" (/reset-password)
// ไม่ให้ตั้งรหัสใหม่ได้ทันทีโดยไม่ยืนยันตัวตน (เครื่องที่ล็อกอินค้างไว้จะเปลี่ยนรหัสไม่ได้ถ้าไม่เข้าอีเมล)
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { supabase } from '@/lib/supabase';

const COOLDOWN_S = 60; // กันกดซ้ำ (Supabase จำกัดจำนวนอีเมลต่อชั่วโมง)

export function ForgotPasswordCard({ email }: { email: string | undefined }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send() {
    if (!email || state === 'sending' || cooldown > 0) return;
    setState('sending');
    setError('');
    const { error: err } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (err) {
      setState('idle');
      return setError(err.status === 429 ? 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองอีกครั้ง' : 'ส่งลิงก์ไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
    setState('sent');
    setCooldown(COOLDOWN_S);
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="text-title">รหัสผ่าน</h2>
      <p className="text-[13px] leading-[1.6] text-muted">
        ลืมรหัสผ่านหรือต้องการเปลี่ยน? ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมล <b className="font-semibold text-ink">{email ?? '—'}</b> เปิดลิงก์ในอีเมลเพื่อตั้งรหัสใหม่
      </p>
      {error && (
        <p role="alert" className="rounded-item bg-danger-soft px-3.5 py-3 text-[13px] text-danger-text">
          {error}
        </p>
      )}
      {state === 'sent' && (
        <p role="status" className="flex items-start gap-1.5 rounded-item bg-brand-soft px-3.5 py-3 text-[13px] leading-[1.6] text-brand-deep">
          <Icon name="mark_email_read" className="mt-0.5 shrink-0 text-[18px]" />
          ส่งลิงก์ไปที่อีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย (รวมถึงจดหมายขยะ) แล้วกดลิงก์เพื่อตั้งรหัสผ่านใหม่
        </p>
      )}
      <Button variant="outline" icon="lock_reset" onClick={send} disabled={!email || state === 'sending' || cooldown > 0} className="self-start">
        {state === 'sending' ? 'กำลังส่ง…' : cooldown > 0 ? `ส่งอีกครั้งได้ใน ${cooldown} วินาที` : state === 'sent' ? 'ส่งลิงก์อีกครั้ง' : 'ลืมรหัสผ่าน / ส่งลิงก์ตั้งรหัสใหม่'}
      </Button>
    </Card>
  );
}
