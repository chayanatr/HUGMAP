'use client';
// จัดเส้นทาง /trips/[id] — id = 'current' คือทริปล่าสุด (สร้างให้ถ้ายังไม่มี)
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageShell, PanelBody, PanelHeader } from '@/components/shell/PageShell';
import { AddPlaceSearch } from '@/components/trips/AddPlaceSearch';
import { DesktopRouteCard, NearbyBar, NearbyPanelCard } from '@/components/trips/Nearby';
import { StopList } from '@/components/trips/StopList';
import { TripCard } from '@/components/trips/TripCard';
import { TripSettingsDialog } from '@/components/trips/TripSettingsDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/components/ui/Toast';
import { createTrip } from '@/lib/trips';
import { useTripPlanner } from '@/lib/useTripPlanner';
import { usePlaces } from '@/lib/usePlaces';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function TripPlannerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const { places, status: placesStatus } = usePlaces();
  const planner = useTripPlanner(params.id, places, toast);
  const { status, trip, days, day, dayIdx, dayPlaces, sched, hits, radiusKm, actions } = planner;
  const [editing, setEditing] = useState(false);

  // /trips/current → แสดง id จริงใน URL โดยไม่โหลดหน้าใหม่
  useEffect(() => {
    if (params.id === 'current' && trip) window.history.replaceState(null, '', `/trips/${trip.id}`);
  }, [params.id, trip]);

  const stopPts = useMemo(() => dayPlaces.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, name: p.name, category: p.category })), [dayPlaces]);
  const nearbyPts = useMemo(() => hits.map((h) => ({ id: h.place.id, lat: h.place.lat, lng: h.place.lng, name: h.place.name, category: h.place.category })), [hits]);
  const placesReady = placesStatus === 'ready';
  const fitKey = `${trip?.id}|${day?.id}|${placesReady}`;
  const summaryHref = trip ? `/trips/${trip.id}/summary?r=${radiusKm}` : '#';

  const newTrip = async () => {
    try {
      const t = await createTrip();
      setEditing(false);
      router.push(`/trips/${t.id}`);
      toast(`สร้างทริป ${t.code} แล้ว`);
    } catch {
      toast('สร้างทริปใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง');
    }
  };

  const message =
    status === 'loading' ? 'กำลังโหลดทริป…' : status === 'missing' ? 'ไม่พบทริปนี้ อาจถูกลบไปแล้ว' : status === 'error' ? 'โหลดทริปไม่สำเร็จ' : null;

  return (
    <PageShell
      panel={
        <>
          <PanelHeader>
            <AddPlaceSearch places={places} excludeIds={new Set(day?.placeIds)} onAdd={(p) => actions.addPlace(p)} />
            <IconButton icon="auto_awesome" label="จัดลำดับอัตโนมัติ" onClick={actions.autoOrder} disabled={!day} />
            <IconButton icon="link" label="แชร์ลิงก์ลูกค้า" onClick={actions.shareLink} disabled={!trip} />
          </PanelHeader>
          <PanelBody>
            {message && (
              <Card className="flex flex-col items-start gap-3 p-4">
                <p className="text-[14px] leading-[1.6] text-muted" role={status === 'loading' ? undefined : 'alert'}>
                  {message}
                </p>
                {status === 'error' && (
                  <Button variant="outline" icon="refresh" onClick={planner.reload}>
                    ลองอีกครั้ง
                  </Button>
                )}
                {status === 'missing' && (
                  <Button variant="outline" href="/trips/current">
                    ไปที่ทริปล่าสุด
                  </Button>
                )}
              </Card>
            )}

            {trip && day && (
              <>
                <TripCard
                  trip={trip}
                  days={days}
                  dayIdx={dayIdx}
                  sched={sched}
                  isRoad={planner.isRoad}
                  routeLoading={planner.routeLoading}
                  onSelectDay={planner.setDayIdx}
                  onAddDay={actions.addDay}
                  onDeleteDay={() => {
                    if (window.confirm(`ลบวันที่ ${day.dayNo} พร้อมจุดแวะทั้งหมดในวันนั้น?`)) actions.deleteDay();
                  }}
                  onEdit={() => setEditing(true)}
                />

                {day.placeIds.length === 0 ? (
                  <Card className="p-4 text-[14px] leading-[1.6] text-muted">ยังไม่มีจุดแวะในวันที่ {day.dayNo} ค้นหาชื่อสถานที่ในช่องด้านบนเพื่อเพิ่ม</Card>
                ) : (
                  <StopList
                    stops={sched.stops}
                    hits={hits}
                    onMove={actions.moveStop}
                    onRemove={actions.removeStop}
                    onAddNearby={(h, at) => actions.addPlace(h.place, at)}
                  />
                )}

                <NearbyPanelCard dayNo={day.dayNo} hits={hits} radiusKm={radiusKm} onRadius={planner.setRadiusKm} onAdd={(h) => actions.addPlace(h.place, h.segment + 1)} />

                <Button href={summaryHref} iconAfter="arrow_forward" className="!h-12 w-full lg:hidden">
                  ดูสรุปเส้นทาง
                </Button>
              </>
            )}
          </PanelBody>
          {trip && <TripSettingsDialog trip={trip} open={editing} onClose={() => setEditing(false)} onSave={actions.updateTrip} onNewTrip={newTrip} />}
        </>
      }
      map={
        <>
          <MapView stops={stopPts} nearby={nearbyPts} routeLine={day?.route?.line} fitKey={fitKey} myLocation />
          {day && (
            <>
              <NearbyBar dayNo={day.dayNo} hits={hits} radiusKm={radiusKm} onRadius={planner.setRadiusKm} onAdd={(h) => actions.addPlace(h.place, h.segment + 1)} />
              <DesktopRouteCard dayNo={day.dayNo} stops={sched.stops} travelMin={sched.travelMin} km={sched.km} summaryHref={summaryHref} />
            </>
          )}
        </>
      }
    />
  );
}
