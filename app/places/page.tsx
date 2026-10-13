'use client';
// แผนที่สถานที่ /places
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageShell, PanelBody, PanelHeader } from '@/components/shell/PageShell';
import { SearchField } from '@/components/shell/SearchField';
import { PlaceCard } from '@/components/places/PlaceCard';
import { PlaceDetailCard } from '@/components/places/PlaceDetailCard';
import { PlaceFilters } from '@/components/places/PlaceFilters';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { useAuth } from '@/lib/auth';
import { usePlaces } from '@/lib/usePlaces';
import type { CategoryKey } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PlacesPage() {
  const { places, status, reload } = usePlaces();
  const isAdmin = useAuth().role === 'admin';
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [cats, setCats] = useState<CategoryKey[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return places.filter(
      (p) => (!city || p.city === city) && (!cats.length || cats.includes(p.category)) && (!needle || p.name.toLowerCase().includes(needle)),
    );
  }, [places, q, city, cats]);

  const selected = filtered.find((p) => p.id === selectedId) ?? null;

  // เลือกจากหมุด → เลื่อนการ์ดในรายการให้เห็น (เลือกจากรายการเอง ไม่ต้องเลื่อน)
  const pickedFromList = useRef(false);
  useEffect(() => {
    if (pickedFromList.current) {
      pickedFromList.current = false;
      return;
    }
    if (selectedId) document.getElementById(`place-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  // mobile: แผนที่อยู่บนสุดของหน้า — เลือกจากรายการแล้วเลื่อนกลับขึ้นไปดูการ์ด
  const selectFromList = (id: string) => {
    pickedFromList.current = id !== selectedId;
    setSelectedId(id);
    if (window.matchMedia('(max-width: 639px)').matches) document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const mapPlaces = useMemo(() => filtered.map((p) => ({ ...p, selected: p.id === selectedId })), [filtered, selectedId]);

  return (
    <PageShell
      tallMap
      panel={
        <>
          <PanelHeader>
            <SearchField label="ค้นหาชื่อสถานที่" placeholder="ค้นหาสถานที่…" value={q} onChange={(e) => setQ(e.target.value)} />
            {isAdmin && <IconButton variant="primary" icon="add_location_alt" label="เพิ่มสถานที่" href="/places/new" />}
          </PanelHeader>
          <PanelBody>
            <PlaceFilters city={city} cats={cats} count={filtered.length} onCity={setCity} onCats={setCats} />
            {status === 'loading' && <Card className="p-4 text-[14px] text-muted">กำลังโหลดสถานที่…</Card>}
            {status === 'error' && (
              <Card className="flex flex-col items-start gap-3 p-4">
                <p className="text-[14px] leading-[1.6] text-danger-text" role="alert">
                  โหลดข้อมูลสถานที่ไม่สำเร็จ
                </p>
                <Button variant="outline" icon="refresh" onClick={reload}>
                  ลองอีกครั้ง
                </Button>
              </Card>
            )}
            {status === 'ready' && filtered.length === 0 && (
              <Card className="p-4 text-[14px] leading-[1.6] text-muted">
                {places.length ? 'ไม่พบสถานที่ที่ตรงกับตัวกรอง' : 'ยังไม่มีสถานที่ กดปุ่มเพิ่มสถานที่เพื่อเริ่มต้น'}
              </Card>
            )}
            {filtered.map((p) => (
              <PlaceCard key={p.id} place={p} selected={p.id === selectedId} onSelect={selectFromList} />
            ))}
          </PanelBody>
        </>
      }
      map={
        <>
          <MapView places={mapPlaces} focus={selected} fitKey={`${status}|${city}|${cats.join(',')}`} onSelect={setSelectedId} />
          {selected && <PlaceDetailCard place={selected} canEdit={isAdmin} onClose={() => setSelectedId(null)} />}
        </>
      }
    />
  );
}
