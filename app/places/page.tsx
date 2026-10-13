// แผนที่สถานที่ /places
// เฟส 1: โครงหน้า (shell) เท่านั้น — เฟส 2 เติมข้อมูลจาก Supabase, ตัวกรอง, การ์ดสถานที่
import dynamic from 'next/dynamic';
import { PageShell, PanelBody, PanelHeader } from '@/components/shell/PageShell';
import { SearchField } from '@/components/shell/SearchField';
import { IconButton } from '@/components/ui/IconButton';
import { Card } from '@/components/ui/Card';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PlacesPage() {
  return (
    <PageShell
      tallMap
      panel={
        <>
          <PanelHeader>
            <SearchField label="ค้นหาชื่อสถานที่" placeholder="ค้นหาชื่อสถานที่" />
            <IconButton variant="primary" icon="add_location_alt" label="เพิ่มสถานที่" href="/places/new" />
          </PanelHeader>
          <PanelBody>
            <Card className="p-4 text-[14px] leading-[1.6] text-muted">รายการสถานที่จะแสดงที่นี่ (เฟส 2)</Card>
          </PanelBody>
        </>
      }
      map={<MapView />}
    />
  );
}
