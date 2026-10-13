'use client';
import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';

export type Role = 'admin' | 'staff';
export const ROLE_LABEL: Record<Role, string> = { admin: 'ผู้ดูแลระบบ', staff: 'พนักงาน' };

/** role อยู่ใน app_metadata (ผู้ใช้แก้เองไม่ได้) — ค่าอื่น/ไม่มี = ไม่มีสิทธิ์ใช้งาน */
export const roleOf = (user: User | null | undefined): Role | null => {
  const r = user?.app_metadata?.role;
  return r === 'admin' || r === 'staff' ? r : null;
};

interface AuthState {
  user: User | null;
  role: Role | null;
  loading: boolean;
}
const AuthContext = createContext<AuthState>({ user: null, role: null, loading: true });

/** สถานะผู้ใช้ฝั่ง client สำหรับซ่อน/แสดง UI — สิทธิ์จริงบังคับที่ middleware และ RLS ในฐานข้อมูล */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = supabase();
    db.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data } = db.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ user, role: roleOf(user), loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
