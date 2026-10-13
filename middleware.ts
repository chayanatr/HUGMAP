import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// หน้าที่ไม่ต้องล็อกอิน: เข้าสู่ระบบ และลิงก์ลูกค้า (กรองด้วย share_token ที่ฐานข้อมูล)
const isPublic = (path: string) => path === '/login' || path.startsWith('/share/');
// หน้าที่เฉพาะ admin (จัดการสถานที่) — staff ถูกส่งกลับไปแผนที่
const isAdminOnly = (path: string) => path === '/places/new' || /^\/places\/[^/]+\/edit$/.test(path);

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser ตรวจ token กับเซิร์ฟเวอร์ Auth (ไม่เชื่อ cookie อย่างเดียว) และต่ออายุ session ให้
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const role = user?.app_metadata?.role;
  const hasRole = role === 'admin' || role === 'staff';
  const path = request.nextUrl.pathname;

  const redirect = (to: string, search = '') => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = search;
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c)); // คง cookie ที่ต่ออายุแล้ว
    return res;
  };

  if (isPublic(path)) {
    if (path === '/login' && user && hasRole) return redirect(request.nextUrl.searchParams.get('next')?.startsWith('/') ? request.nextUrl.searchParams.get('next')! : '/places');
    return response;
  }
  if (!user) return redirect('/login', `?next=${encodeURIComponent(path + request.nextUrl.search)}`);
  if (!hasRole) return redirect('/login', '?error=no-role');
  if (isAdminOnly(path) && role !== 'admin') return redirect('/places');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|gif)$).*)'],
};
