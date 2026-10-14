'use client';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

export const MIN_PASSWORD_LENGTH = 8;

/** ตั้งรหัสผ่านใหม่ให้ผู้ใช้ที่ล็อกอินอยู่ (หรือเพิ่งเปิดลิงก์รีเซ็ตจากอีเมล) — รหัสผ่านไม่ถูกเก็บหรือบันทึกที่ไหนนอกจาก Supabase Auth */
export function PasswordForm({ submitLabel, onDone }: { submitLabel: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const errors = {
    password: password.length >= MIN_PASSWORD_LENGTH ? '' : `รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`,
    confirm: confirm === password ? '' : 'รหัสผ่านสองช่องไม่ตรงกัน',
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (errors.password || errors.confirm) return;
    setBusy(true);
    const { error: err } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (err) {
      return setError(
        /different|same/i.test(err.message)
          ? 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'
          : /weak|pwned|compromised|easy to guess/i.test(err.message)
            ? 'รหัสผ่านนี้คาดเดาง่ายเกินไป กรุณาเลือกรหัสผ่านอื่น'
            : 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง',
      );
    }
    setPassword('');
    setConfirm('');
    setSubmitted(false);
    onDone();
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-item bg-danger-soft px-3.5 py-3 text-[13px] leading-[1.6] text-danger-text">
          {error}
        </p>
      )}
      <Input
        label="รหัสผ่านใหม่"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={submitted ? errors.password : ''}
      />
      <Input
        label="ยืนยันรหัสผ่านใหม่"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={submitted ? errors.confirm : ''}
      />
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'กำลังบันทึก…' : submitLabel}
      </Button>
    </form>
  );
}
