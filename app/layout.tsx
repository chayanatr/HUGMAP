import type { Metadata } from 'next';
import { Anuphan } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { AppNav } from '@/components/AppNav';
import { ToastProvider } from '@/components/ui/Toast';

const anuphan = Anuphan({ subsets: ['thai', 'latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-anuphan' });

export const metadata: Metadata = { title: 'HUGMAP', description: 'สถานที่ท่องเที่ยว สปป.ลาว และจัดเส้นทาง' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={anuphan.variable}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display -- display=block กันชื่อไอคอนโผล่เป็นข้อความก่อนฟอนต์โหลด */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&display=block" />
      </head>
      <body className="bg-bg text-ink font-sans antialiased">
        <ToastProvider>
          <div className="flex h-dvh print:h-auto">
            <AppNav />
            <main className="relative min-h-0 min-w-0 flex-1 overflow-auto pb-[68px] md:pb-0 print:overflow-visible">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
