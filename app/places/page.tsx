'use client';
// แผนที่สถานที่ /places
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapSearch } from '@/components/MapSearch';
import { PageShell, PanelBody, PanelHeader } from '@/components/shell/PageShell';
import { SearchField } from '@/components/shell/SearchField';
import { PlaceCard } from '@/components/places/PlaceCard';
import { PlaceDetailCard } from '@/components/places/PlaceDetailCard';
import { PlaceFilters } from '@/components/places/PlaceFilters';
import { PickedPointCard, nearestSaved, type PickedPoint } from '@/components/places/PickedPointCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth';
import { resolvePlaceId } from '@/lib/placesSearch';
import { useCurrentTrip } from '@/lib/useCurrentTrip';
import { usePlaces } from '@/lib/usePlaces';
import type { CategoryKey } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function PlacesPage() {
  const { places, status, reload } = usePlaces();
  const isAdmin = useAuth().role === 'admin';
  const toast = useToast();
  const trip = useCurrentTrip(toast);
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [cats, setCats] = useState<CategoryKey[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // จุดที่เลือกบนแผนที่ (กดแผนที่/กดสถานที่ของ Google/ผลค้นหา) → การ์ด "เพิ่มเป็นสถานที่ที่นี่"
  const [picked, setPicked] = useState<PickedPoint | null>(null);
  const [target, setTarget] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(null);
  const pickSeq = useRef(0);

  const pickPoint = (lat: number, lng: number, placeId?: string) => {
    const seq = ++pickSeq.current;
    setSelectedId(null);
    setPicked({ lat, lng, loading: !!placeId });
    if (!placeId) return;
    resolvePlaceId(placeId)
      .then((loc) => seq === pickSeq.current && setPicked({ lat, lng, name: loc.name, address: loc.address }))
      .catch(() => seq === pickSeq.current && setPicked({ lat, lng })); // ดึงชื่อไม่ได้ = ใช้พิกัดที่กด
  };
  const nearest = useMemo(() => (picked ? nearestSaved(picked, places) : null), [picked, places]);

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
              <PlaceCard key={p.id} place={p} selected={p.id === selectedId} inTrip={trip.inTripIds.has(p.id)} onSelect={selectFromList} />
            ))}
          </PanelBody>
        </>
      }
      map={
        <>
          <MapView places={mapPlaces} focus={selected} fitKey={`${status}|${city}|${cats.join(',')}`} onSelect={(id) => {
              setPicked(null);
              setSelectedId(id);
            }}
            pin={picked}
            onPick={pickPoint}
            target={target}
            myLocation
          />
          <MapSearch
            places={places}
            className="absolute left-3 top-3 z-[1000] w-[calc(100%-4.75rem)] md:w-[360px]"
            onSelectSaved={(p) => {
              setPicked(null);
              setSelectedId(p.id);
              setTarget({ lat: p.lat, lng: p.lng, zoom: 16, key: Date.now() });
            }}
            onPickGoogle={(loc) => {
              pickSeq.current++;
              setSelectedId(null);
              setPicked({ lat: loc.lat, lng: loc.lng, name: loc.name, address: loc.address });
              setTarget({ lat: loc.lat, lng: loc.lng, zoom: 17, key: Date.now() });
            }}
          />
          {picked && !selected && <PickedPointCard point={picked} canAdd={isAdmin} nearest={nearest} onClose={() => setPicked(null)} />}
          {selected && (
            <PlaceDetailCard
              place={selected}
              canEdit={isAdmin}
              onClose={() => setSelectedId(null)}
              tripAction={
                trip.loaded &&
                (trip.inCurrentDay(selected.id) ? (
                  <div role="status" className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-input bg-dark-field text-[14px] font-semibold text-dark-soft">
                    <Icon name="check" className="text-[18px] text-brand-mint" />
                    อยู่ในวันที่ {trip.dayNo} แล้ว
                  </div>
                ) : (
                  <Button variant="light" className="flex-1" disabled={trip.busy} onClick={() => trip.addToCurrentDay(selected)}>
                    + เพิ่มในวันที่ {trip.dayNo}
                  </Button>
                ))
              }
            />
          )}
        </>
      }
    />
  );
}
