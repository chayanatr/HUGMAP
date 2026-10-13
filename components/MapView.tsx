'use client';
// แผนที่ Google Maps (Maps JavaScript API ผ่าน @vis.gl/react-google-maps)
// ใช้ผ่าน: const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });
import { AdvancedMarker, AdvancedMarkerAnchorPoint, ControlPosition, Map, Pin, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { CAT } from '@/lib/categories';
import { cn } from '@/lib/cn';
import type { CategoryKey } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';

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

export default function MapView({
  theme = 'light', stops = [], places = [], nearby = [], routeLine, pin, fitKey = 'default', focus, onSelect, onPick,
}: {
  theme?: 'light' | 'dark'; stops?: Pt[]; places?: Pt[]; nearby?: Pt[]; routeLine?: [number, number][];
  pin?: LL | null; fitKey?: string; focus?: LL | null;
  onSelect?: (id: string) => void; onPick?: (lat: number, lng: number) => void;
}) {
  const line = useMemo<LL[]>(
    () => (routeLine ?? stops.map((s) => [s.lat, s.lng] as [number, number])).map(([lat, lng]) => ({ lat, lng })),
    [routeLine, stops],
  );
  const fitPts: [number, number][] = stops.length ? stops.map((s) => [s.lat, s.lng]) : pin ? [[pin.lat, pin.lng]] : places.map((p) => [p.lat, p.lng]);

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
        onClick={(e) => e.detail.latLng && onPick?.(e.detail.latLng.lat, e.detail.latLng.lng)}
        className="h-full w-full"
      >
        <Fit points={fitPts} fitKey={fitKey} />
        <Focus point={focus} />

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
