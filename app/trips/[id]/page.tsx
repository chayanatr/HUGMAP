'use client';
// จัดเส้นทาง /trips/[id] — id = 'current' คือทริปล่าสุด (สร้างให้ถ้ายังไม่มี)
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageShell, PanelBody, PanelHeader } from '@/components/shell/PageShell';
import { AddPlaceSearch } from '@/components/trips/AddPlaceSearch';
import { EndpointDialog, KIND_LABEL, type EndpointDraft, type EndpointKind } from '@/components/trips/EndpointDialog';
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
  // แก้ไขจุดรับ/ส่ง: draft อยู่ที่หน้านี้เพราะ "แตะบนแผนที่" ต้องปิดกล่องชั่วคราว
  const [ep, setEp] = useState<{ kind: EndpointKind; draft: EndpointDraft; picking: boolean } | null>(null);
  const openEndpoint = (kind: EndpointKind) => {
    const cur = kind === 'start' ? day?.start : day?.end;
    setEp({ kind, draft: cur ? { ...cur } : { name: '', lat: null, lng: null }, picking: false });
  };
  const pickOnMap = (lat: number, lng: number) =>
    setEp((cur) => (cur?.picking ? { ...cur, picking: false, draft: { name: cur.draft.name.trim() || KIND_LABEL[cur.kind], lat, lng } } : cur));

  // /trips/current → แสดง id จริงใน URL โดยไม่โหลดหน้าใหม่; ยังไม่มีทริปเลย → ไปหน้ารายการทริปเพื่อสร้าง
  useEffect(() => {
    if (params.id !== 'current') return;
    if (trip) window.history.replaceState(null, '', `/trips/${trip.id}`);
    else if (status === 'missing') router.replace('/trips');
  }, [params.id, trip, status, router]);

  const stopPts = useMemo(() => dayPlaces.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, name: p.name, category: p.category })), [dayPlaces]);
  const nearbyPts = useMemo(() => hits.map((h) => ({ id: h.place.id, lat: h.place.lat, lng: h.place.lng, name: h.place.name, category: h.place.category })), [hits]);
  const placesReady = placesStatus === 'ready';
  const fitKey = `${trip?.id}|${day?.id}|${placesReady}|${day?.start?.lat},${day?.start?.lng}|${day?.end?.lat},${day?.end?.lng}`;
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
            <IconButton icon="folder_open" label="ทริปทั้งหมด" href="/trips" />
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
                  <Button variant="outline" href="/trips">
                    ไปที่ทริปทั้งหมด
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
                  hasStart={!!day.start}
                  isRoad={planner.isRoad}
                  routeLoading={planner.routeLoading}
                  onSelectDay={planner.setDayIdx}
                  onAddDay={actions.addDay}
                  onDeleteDay={() => {
                    if (window.confirm(`ลบวันที่ ${day.dayNo} พร้อมจุดแวะทั้งหมดในวันนั้น?`)) actions.deleteDay();
                  }}
                  onEdit={() => setEditing(true)}
                />

                {day.placeIds.length === 0 && (
                  <Card className="flex flex-col items-start gap-3 p-4 text-[14px] leading-[1.6] text-muted">
                    <p>
                      {day.start && day.end
                        ? planner.allHitsCount
                          ? `พบสถานที่แนะนำระหว่างจุดรับ–จุดส่ง ${planner.allHitsCount} แห่ง เพิ่มทีละแห่งจากรายการด้านล่าง หรือให้ระบบเลือกให้`
                          : planner.routeLoading
                            ? 'กำลังหาสถานที่ระหว่างจุดรับ–จุดส่ง…'
                            : 'ไม่พบสถานที่ในรัศมีนี้ ลองขยายรัศมีค้นหา หรือค้นหาชื่อสถานที่ด้านบน'
                        : `ตั้งจุดรับและจุดส่งลูกค้าของวันที่ ${day.dayNo} แล้วระบบจะแนะนำสถานที่ท่องเที่ยวและร้านอาหารระหว่างทางให้เพิ่มลงทริปได้ทันที หรือค้นหาชื่อสถานที่ด้านบนเพื่อเพิ่มเอง`}
                    </p>
                    {day.start && day.end && planner.allHitsCount > 0 && (
                      <Button icon="auto_awesome" onClick={actions.autoFill}>
                        เติมสถานที่แนะนำให้อัตโนมัติ
                      </Button>
                    )}
                  </Card>
                )}
                <StopList
                  stops={sched.stops}
                  hits={hits}
                  start={day.start}
                  end={day.end}
                  startLeg={sched.startLeg}
                  departMin={trip.day_start_min}
                  arriveMin={sched.arriveMin}
                  onEditEndpoint={openEndpoint}
                  onMove={actions.moveStop}
                  onRemove={actions.removeStop}
                  onAddNearby={(h, at) => actions.addPlace(h.place, at)}
                />
                <NearbyPanelCard dayNo={day.dayNo} hits={hits} radiusKm={radiusKm} onRadius={planner.setRadiusKm} filter={planner.nearbyFilter} onFilter={planner.setNearbyFilter} onAdd={(h) => actions.addPlace(h.place, h.segment + 1)} />

                <Button href={summaryHref} iconAfter="arrow_forward" className="!h-12 w-full lg:hidden">
                  ดูสรุปเส้นทาง
                </Button>
              </>
            )}
          </PanelBody>
          {day && ep && (
            <EndpointDialog
              kind={ep.kind}
              dayNo={day.dayNo}
              open={!ep.picking}
              draft={ep.draft}
              hasExisting={!!(ep.kind === 'start' ? day.start : day.end)}
              places={places}
              onChange={(draft) => setEp((cur) => cur && { ...cur, draft })}
              onPickOnMap={() => setEp((cur) => cur && { ...cur, picking: true })}
              onSave={(e) => {
                actions.setEndpoints(ep.kind, e);
                setEp(null);
              }}
              onClear={() => {
                actions.setEndpoints(ep.kind, null);
                setEp(null);
              }}
              onClose={() => setEp((cur) => (cur?.picking ? cur : null))}
            />
          )}
          {trip && (
            <TripSettingsDialog
              trip={trip}
              open={editing}
              onClose={() => setEditing(false)}
              onSave={actions.updateTrip}
              onNewTrip={newTrip}
              onRevokeLink={() => {
                if (window.confirm('ยกเลิกลิงก์ลูกค้าของทริปนี้?\nลูกค้าที่มีลิงก์เดิมจะเปิดดูไม่ได้อีก (กดปุ่มแชร์ลิงก์เพื่อสร้างลิงก์ใหม่ได้ภายหลัง)')) actions.revokeShareLink();
              }}
            />
          )}
        </>
      }
      map={
        <>
          <MapView
            stops={stopPts}
            nearby={nearbyPts}
            routeLine={day?.route?.line}
            start={day?.start}
            end={day?.end}
            fitKey={fitKey}
            myLocation
            onPick={ep?.picking ? pickOnMap : undefined}
          />
          {ep?.picking && (
            <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-input bg-brand-deep px-3.5 py-2 text-[13px] text-white shadow-dark">
              แตะบนแผนที่เพื่อเลือก{KIND_LABEL[ep.kind]}
              <button
                type="button"
                onClick={() => setEp((cur) => cur && { ...cur, picking: false })}
                className="h-11 rounded-[8px] px-2 font-semibold underline focus-visible:outline-none focus-visible:shadow-focus md:h-8"
              >
                ยกเลิก
              </button>
            </div>
          )}
          {day && (
            <>
              <NearbyBar dayNo={day.dayNo} hits={hits} radiusKm={radiusKm} onRadius={planner.setRadiusKm} filter={planner.nearbyFilter} onFilter={planner.setNearbyFilter} onAdd={(h) => actions.addPlace(h.place, h.segment + 1)} />
              <DesktopRouteCard dayNo={day.dayNo} stops={sched.stops} travelMin={sched.travelMin} km={sched.km} summaryHref={summaryHref} start={day.start} end={day.end} />
            </>
          )}
        </>
      }
    />
  );
}
