// แผนที่สถานที่ /places
// สร้าง UI ตาม design_handoff_champa_route/README.md และ design/Champa Route.dc.html
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PlacesPage() {
  // TODO: โหลด places จาก Supabase, filters {city, cats, q}, selectedId
  // Layout: grid lg:grid-cols-[420px_1fr] md:grid-cols-[340px_1fr] h-full; mobile: แผนที่ 320px ด้านบน
  return <div className="grid h-full md:grid-cols-[340px_1fr] lg:grid-cols-[420px_1fr]"><aside className="bg-surface border-r border-line" /><div className="relative h-80 md:h-full"><MapView /></div></div>;
}
