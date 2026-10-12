'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/places', label: 'แผนที่สถานที่', short: 'สถานที่', icon: 'map' },
  { href: '/trips/current', label: 'จัดเส้นทาง', short: 'เส้นทาง', icon: 'route' },
  { href: '/trips/current/summary', label: 'สรุปเส้นทาง', short: 'สรุป', icon: 'description' },
  { href: '/places/new', label: 'เพิ่มสถานที่', short: 'เพิ่ม', icon: 'add_location_alt' },
];

/** Rail สีเขียว (tablet/desktop) + bottom nav (mobile) */
export function AppNav({ apiStatus = 'demo' }: { apiStatus?: 'ok' | 'demo' | 'error' }) {
  const path = usePathname();
  const active = (href: string) =>
    href === '/places' ? path === '/places' : href === '/trips/current' ? path.startsWith('/trips') && !path.endsWith('/summary') : path.startsWith(href);
  const dot = apiStatus === 'ok' ? 'bg-success' : apiStatus === 'error' ? 'bg-danger' : 'bg-warning';
  return (
    <>
      <nav className="no-print relative z-[900] hidden w-rail-tab shrink-0 flex-col items-center gap-1.5 bg-brand py-[18px] md:flex lg:w-rail">
        <div className="flex flex-col items-center gap-1.5">
          <div className="icon grid h-10 w-10 place-items-center rounded-item bg-white text-2xl text-brand">map</div>
          <div className="text-[10px] font-bold tracking-[.08em] text-white">HUGMAP</div>
        </div>
        <div className="my-3.5 mb-[18px] grid h-[38px] w-[38px] place-items-center rounded-full border-2 border-white/50 bg-avatar text-[13px] font-semibold text-white">นภ</div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} title={n.label}
            className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] ${active(n.href) ? 'bg-black/[.16] text-white' : 'text-brand-onrail hover:text-white'}`}>
            <span className="icon text-[22px]">{n.icon}</span>{n.short}
          </Link>
        ))}
        <div className="mt-auto flex flex-col items-center gap-1 text-[10px] text-brand-onrail" title="สถานะ API">
          <span className={`h-2.5 w-2.5 rounded-full border-2 border-white/60 ${dot}`} />API
        </div>
      </nav>
      <nav className="no-print fixed inset-x-0 bottom-0 z-[900] grid h-[68px] grid-cols-4 bg-brand pb-2 md:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${active(n.href) ? 'font-semibold text-white' : 'text-brand-onrail'}`}>
            <span className="icon text-2xl">{n.icon}</span>{n.short}
          </Link>
        ))}
      </nav>
    </>
  );
}
