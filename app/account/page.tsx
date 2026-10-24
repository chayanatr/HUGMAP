'use client';
// บัญชีของฉัน /account
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PasswordForm } from '@/components/auth/PasswordForm';
import { Button } from '@/components/ui/Button';
import { Card, LabelValue } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { ROLE_LABEL, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, role, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await supabase().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-4 p-4 md:p-7">
      <h1 className="text-h2">บัญชีของฉัน</h1>
      <Card className="flex flex-col gap-4 p-4">
        {loading ? (
          <p className="text-[14px] text-muted">กำลังโหลด…</p>
        ) : (
          <>
            <LabelValue label="อีเมล">{user?.email ?? '—'}</LabelValue>
            <div>
              <div className="text-label">สิทธิ์การใช้งาน</div>
              <div className="mt-1">{role && <Pill tone={role === 'admin' ? 'brand' : 'success'}>{ROLE_LABEL[role]}</Pill>}</div>
            </div>
            <p className="text-[12px] leading-[1.6] text-placeholder">
              {role === 'admin' ? 'จัดการสถานที่และจัดทริปได้' : 'จัดทริปได้ (การเพิ่ม/แก้ไขสถานที่เป็นสิทธิ์ของผู้ดูแลระบบ)'}
            </p>
          </>
        )}
      </Card>
      <Card className="flex flex-col gap-4 p-4">
        <h2 className="text-title">เปลี่ยนรหัสผ่าน</h2>
        <PasswordForm submitLabel="บันทึกรหัสผ่านใหม่" onDone={() => toast('เปลี่ยนรหัสผ่านแล้ว')} />
      </Card>
      <Button variant="outline" icon="logout" onClick={signOut} disabled={busy} className="w-full">
        {busy ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
      </Button>
    </div>
  );
}
