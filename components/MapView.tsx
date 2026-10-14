'use client';
// แผนที่ Google Maps (Maps JavaScript API ผ่าน @vis.gl/react-google-maps)
// ใช้ผ่าน: const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
import { AdvancedMarker, AdvancedMarkerAnchorPoint, ControlPosition, Map, MapControl, Pin, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { CAT } from '@/lib/categories';
import { cn } from '@/lib/cn';
import { fixMessage, geoErrorMessage, getMyPosition, type Fix } from '@/lib/geolocation';
import type { CategoryKey, Endpoint } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
// Map ID (Vector) จาก Google Cloud Console → Map Management — จำเป็นสำหรับ AdvancedMarker
// ใช้สไตล์มาตรฐานของ Google ตามที่เจ้าของโปรเจกต์เลือก; DEMO_MAP_ID สำหรับพัฒนาเท่านั้น
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID';
const LAOS_CENTER = { lat: 19.89, lng: 102.14 };
const ROUTE_COLOR = '#2F8466'; // = brand ใน tailwind.config.ts (Polyline รับได้เฉพาะสตริงสี)

type LL = { lat: number; lng: number };
type Pt = { id?: string; lat: number; lng: number; name: string; category?: CategoryKey; selected?: boolean };

const shell = 'grid place-items-center font-semibold shadow-[0_2px_8px_rgba(20,25,56,.35)]';

function Fit({ points, fitKey }: { points: [number, number][]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const fit = () => {
      if (points.length === 1) {
        map.setCenter({ lat: points[0][0], lng: points[0][1] });
        map.setZoom(16);
      } else if (points.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        points.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
        map.fitBounds(bounds, 48);
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if ((map.getZoom() ?? 0) > 17) map.setZoom(17);
        });
      }
    };
    // กรอบแผนที่ที่ยังไม่มีขนาด (แท็บถูกซ่อน/เลย์เอาต์ยังไม่เสร็จ) fit แล้วจะซูมออกกว้างเกิน → รอจนมีขนาดก่อน
    const div = map.getDiv();
    if (div.offsetWidth > 0 && div.offsetHeight > 0) return fit();
    const ro = new ResizeObserver(() => {
      if (div.offsetWidth > 0 && div.offsetHeight > 0) {
        ro.disconnect();
        fit();
      }
    });
    ro.observe(div);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);
  return null;
}

/** เลื่อนแผนที่ไปหาจุดที่เลือก ถ้าอยู่นอกกรอบที่เห็น (ไม่ซูม) */
function Focus({ point }: { point?: LL | null }) {
  const map = useMap();
  useEffect(() => {
    if (map && point && !map.getBounds()?.contains(point)) map.panTo(point);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, point?.lat, point?.lng]);
  return null;
}

/** บินไปยังจุดที่ค้นหา: เลื่อนกึ่งกลาง + ตั้งระดับซูม (ต่างจาก Focus ที่เลื่อนเฉพาะเมื่อจุดอยู่นอกจอ) */
function FlyTo({ target }: { target?: (LL & { zoom?: number; key?: number }) | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    map.setZoom(target.zoom ?? 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, target?.lat, target?.lng, target?.key]);
  return null;
}

function Line({ path, weight, opacity }: { path: LL[]; weight: number; opacity: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const line = new google.maps.Polyline({ path, strokeColor: ROUTE_COLOR, strokeWeight: weight, strokeOpacity: opacity, clickable: false, map });
    return () => line.setMap(null);
  }, [map, path, weight, opacity]);
  return null;
}

function Dot({ size, className, style, children }: { size: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn(shell, 'rounded-full border-2', className)} style={{ width: size, height: size, ...style }}>
      {children}
    </div>
  );
}

/** ปุ่ม "ตำแหน่งของฉัน" (GPS): จุดตำแหน่ง + วงกลมความแม่นยำ แล้วเลื่อนแผนที่ไปหา — ตำแหน่งไม่ถูกส่งหรือบันทึกที่ไหน */
function MyLocation() {
  const map = useMap();
  const toast = useToast();
  const [status, setStatus] = useState<'idle' | 'loading' | 'active'>('idle');
  const [me, setMe] = useState<Fix | null>(null);

  useEffect(() => {
    if (!map || !me) return;
    const circle = new google.maps.Circle({
      map,
      center: me,
      radius: Math.min(me.accuracy, 2000),
      strokeColor: ROUTE_COLOR,
      strokeOpacity: 0.35,
      strokeWeight: 1,
      fillColor: ROUTE_COLOR,
      fillOpacity: 0.12,
      clickable: false,
    });
    return () => circle.setMap(null);
  }, [map, me]);

  async function locate() {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const fix = await getMyPosition();
      setMe(fix);
      setStatus('active');
      map?.panTo(fix);
      if ((map?.getZoom() ?? 0) < 15) map?.setZoom(fix.accuracy < 200 ? 16 : 14);
      toast(fixMessage(fix), fix.accuracy > 100 ? 'error' : 'success');
    } catch (e) {
      setStatus(me ? 'active' : 'idle');
      toast(geoErrorMessage(e), 'error');
    }
  }

  return (
    <>
      <MapControl position={ControlPosition.RIGHT_TOP}>
        <button
          type="button"
          onClick={locate}
          aria-label="ตำแหน่งของฉัน (GPS)"
          title="ตำแหน่งของฉัน (GPS)"
          className="mr-2.5 mt-2.5 grid h-11 w-11 place-items-center rounded-input border border-line-border bg-surface text-brand-hover shadow-overlay focus-visible:outline-none focus-visible:shadow-focus md:h-10 md:w-10"
        >
          <Icon name={status === 'loading' ? 'location_searching' : status === 'active' ? 'gps_fixed' : 'my_location'} className={cn('text-[22px]', status === 'loading' && 'animate-pulse')} />
        </button>
      </MapControl>
      {me && (
        <AdvancedMarker position={me} title="ตำแหน่งของฉัน" zIndex={2500} anchorPoint={AdvancedMarkerAnchorPoint.CENTER}>
          <Dot size={18} className="border-white bg-brand">
            {null}
          </Dot>
        </AdvancedMarker>
      )}
    </>
  );
}

export default function MapView({
  theme = 'light', stops = [], places = [], nearby = [], routeLine, start, end, pin, fitKey = 'default', focus, target, myLocation = false, onSelect, onPick,
}: {
  theme?: 'light' | 'dark'; stops?: Pt[]; places?: Pt[]; nearby?: Pt[]; routeLine?: [number, number][];
  /** จุดรับ/ส่งลูกค้าของวัน — วาดเป็นหมุดพิเศษและรวมในเส้นตรงสำรอง/การ fit */
  start?: Endpoint | null; end?: Endpoint | null;
  pin?: LL | null; fitKey?: string; focus?: LL | null;
  /** บินไปยังจุด (ผลค้นหา): เลื่อน + ซูม; key เปลี่ยนเพื่อบินซ้ำจุดเดิม */
  target?: (LL & { zoom?: number; key?: number }) | null;
  /** แสดงปุ่ม "ตำแหน่งของฉัน" (GPS) — ใช้ในหน้าที่พนักงานใช้ (ไม่ใช้ในหน้าสรุป/ลิงก์ลูกค้า) */
  myLocation?: boolean;
  onSelect?: (id: string) => void;
  /** กดบนแผนที่ (placeId = กดโดนสถานที่ของ Google) หรือลากหมุด pin */
  onPick?: (lat: number, lng: number, placeId?: string) => void;
}) {
  const line = useMemo<LL[]>(
    () =>
      routeLine
        ? routeLine.map(([lat, lng]) => ({ lat, lng }))
        : [...(start ? [start] : []), ...stops, ...(end ? [end] : [])].map(({ lat, lng }) => ({ lat, lng })),
    [routeLine, stops, start, end],
  );
  const routePts: [number, number][] = [...(start ? [start] : []), ...stops, ...(end ? [end] : [])].map((s) => [s.lat, s.lng]);
  const fitPts: [number, number][] = routePts.length ? routePts : pin ? [[pin.lat, pin.lng]] : places.map((p) => [p.lat, p.lng]);

  if (!API_KEY) {
    return (
      <div className="grid h-full w-full place-items-center bg-map p-6 text-center text-[14px] leading-[1.6] text-muted">
        ยังไม่ได้ตั้งค่า Google Maps API key
        <br />
        (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
      </div>
    );
  }

  // ต้องอยู่ใต้ <MapProvider> (app/places/layout.tsx, app/trips/layout.tsx)
  return (
    <>
      <Map
        mapId={MAP_ID}
        colorScheme={theme === 'dark' ? 'DARK' : 'LIGHT'}
        defaultCenter={LAOS_CENTER}
        defaultZoom={14}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        controlSize={window.innerWidth < 640 ? 44 : undefined} // mobile: ปุ่มกดอย่างน้อย 44px
        zoomControlOptions={{ position: ControlPosition.TOP_RIGHT }}
        onClick={(e) => {
          if (!e.detail.latLng || !onPick) return;
          if (e.detail.placeId) e.stop(); // ไม่ให้ขึ้นกล่องข้อมูลของ Google ซ้อนกับของเรา
          onPick(e.detail.latLng.lat, e.detail.latLng.lng, e.detail.placeId ?? undefined);
        }}
        className="h-full w-full"
      >
        <Fit points={fitPts} fitKey={fitKey} />
        <Focus point={focus} />
        <FlyTo target={target} />
        {myLocation && <MyLocation />}

        {places.map((p) => {
          const c = CAT[p.category ?? 'temple'];
          const size = p.selected ? 36 : 26;
          return (
            <AdvancedMarker
              key={p.id ?? `${p.lat},${p.lng}`}
              position={p}
              title={p.name}
              anchorPoint={AdvancedMarkerAnchorPoint.CENTER}
              zIndex={p.selected ? 2000 : 0}
              onClick={() => p.id && onSelect?.(p.id)}
            >
              <Dot size={size} className={cn('text-white', p.selected ? 'border-ink' : theme === 'dark' ? 'border-dark' : 'border-white')} style={{ background: c.color, fontSize: p.selected ? 20 : 15 }}>
                <Icon name={c.icon} />
              </Dot>
            </AdvancedMarker>
          );
        })}

        {nearby.map((p) => {
          const c = CAT[p.category ?? 'temple'];
          return (
            <AdvancedMarker key={`n${p.id}`} position={p} title={`ใกล้เส้นทาง · ${p.name}`} anchorPoint={AdvancedMarkerAnchorPoint.CENTER}>
              <Dot size={26} className="border-dashed bg-white" style={{ borderColor: c.color, color: c.color, fontSize: 15 }}>
                <Icon name={c.icon} />
              </Dot>
            </AdvancedMarker>
          );
        })}

        {line.length > 1 && (
          <>
            <Line path={line} weight={14} opacity={0.12} />
            <Line path={line} weight={3.5} opacity={1} />
          </>
        )}

        {stops.map((s, i) => {
          const end = i === 0 || i === stops.length - 1;
          return (
            <AdvancedMarker key={`s${i}`} position={s} title={s.name} anchorPoint={AdvancedMarkerAnchorPoint.CENTER} zIndex={1000}>
              {end ? (
                <Dot size={22} className="border-white bg-brand text-[11px] text-white">
                  {i + 1}
                </Dot>
              ) : (
                <div className={cn(shell, 'h-[22px] w-[22px] rounded-[5px] border-[2.5px] border-ink bg-white text-[11px] text-ink')}>{i + 1}</div>
              )}
            </AdvancedMarker>
          );
        })}

        {start && (
          <AdvancedMarker position={start} title={`จุดรับ · ${start.name}`} anchorPoint={AdvancedMarkerAnchorPoint.CENTER} zIndex={1100}>
            <Dot size={30} className="border-white bg-brand text-white" style={{ fontSize: 18 }}>
              <Icon name="trip_origin" />
            </Dot>
          </AdvancedMarker>
        )}
        {end && (
          <AdvancedMarker position={end} title={`จุดส่ง · ${end.name}`} anchorPoint={AdvancedMarkerAnchorPoint.CENTER} zIndex={1100}>
            <Dot size={30} className="border-white bg-ink text-white" style={{ fontSize: 18 }}>
              <Icon name="flag" />
            </Dot>
          </AdvancedMarker>
        )}

        {pin && (
          <AdvancedMarker
            position={pin}
            draggable
            zIndex={3000}
            title="ลากเพื่อปรับตำแหน่ง"
            onDragEnd={(e) => e.latLng && onPick?.(e.latLng.lat(), e.latLng.lng())}
          >
            <Pin background={ROUTE_COLOR} borderColor="#FFFFFF" glyphColor="#FFFFFF" />
          </AdvancedMarker>
        )}
      </Map>
    </>
  );
}
