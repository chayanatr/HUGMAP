'use client';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
import { CAT } from '@/lib/categories';
import type { CategoryKey } from '@/lib/types';

// ใช้ผ่าน: const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type Pt = { id?: string; lat: number; lng: number; name: string; category?: CategoryKey; selected?: boolean };

const circle = (size: number, bg: string, border: string, inner: string, fg = '#fff', dashed = false) =>
  L.divIcon({
    className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${fg};border:2px ${dashed ? 'dashed' : 'solid'} ${border};box-shadow:0 2px 8px rgba(20,25,56,.35);display:grid;place-items:center;font:600 13px var(--font-anuphan);">${inner}</div>`,
  });
const iconSpan = (name: string, px: number) => `<span class="icon" style="font-size:${px}px">${name}</span>`;

function Fit({ points, fitKey }: { points: [number, number][]; fitKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 16);
    else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}
/** เลื่อนแผนที่ไปหาจุดที่เลือก ถ้าอยู่นอกกรอบที่เห็น (ไม่ซูม) */
function Focus({ point }: { point?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (point && !map.getBounds().contains([point.lat, point.lng])) map.panTo([point.lat, point.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point?.lat, point?.lng]);
  return null;
}
function Picker({ onPick }: { onPick?: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

export default function MapView({
  theme = 'light', stops = [], places = [], nearby = [], routeLine, pin, fitKey = 'default', focus, onSelect, onPick,
}: {
  theme?: 'light' | 'dark'; stops?: Pt[]; places?: Pt[]; nearby?: Pt[]; routeLine?: [number, number][];
  pin?: { lat: number; lng: number } | null; fitKey?: string; focus?: { lat: number; lng: number } | null;
  onSelect?: (id: string) => void; onPick?: (lat: number, lng: number) => void;
}) {
  const dark = theme === 'dark';
  const ring = dark ? '#141938' : '#fff';
  const line = routeLine ?? stops.map((s) => [s.lat, s.lng] as [number, number]);
  const fitPts: [number, number][] = stops.length ? stops.map((s) => [s.lat, s.lng]) : pin ? [[pin.lat, pin.lng]] : places.map((p) => [p.lat, p.lng]);
  return (
    <MapContainer center={[19.89, 102.14]} zoom={14} zoomControl={false} className="h-full w-full">
      {/* ทดสอบ: Esri Canvas (ไม่ต้องใช้ key) · production: MapTiler / Stadia / self-host ตามปริมาณใช้งาน */}
      <TileLayer url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base'}/MapServer/tile/{z}/{y}/{x}`} maxZoom={19} maxNativeZoom={16} attribution="Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors" />
      <TileLayer url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${dark ? 'World_Dark_Gray_Reference' : 'World_Light_Gray_Reference'}/MapServer/tile/{z}/{y}/{x}`} maxZoom={19} maxNativeZoom={16} />
      <Fit points={fitPts} fitKey={fitKey} />
      <Focus point={focus} />
      <Picker onPick={onPick} />
      {places.map((p) => {
        const c = CAT[p.category ?? 'temple']; const s = p.selected ? 36 : 26;
        return (
          <Marker key={p.id} position={[p.lat, p.lng]} zIndexOffset={p.selected ? 2000 : 0}
            icon={circle(s, c.color, p.selected ? '#1C1D3B' : ring, iconSpan(c.icon, p.selected ? 20 : 15))}
            eventHandlers={{ click: () => p.id && onSelect?.(p.id) }}>
            <Tooltip direction="top" offset={[0, -s / 2]}>{p.name}</Tooltip>
          </Marker>
        );
      })}
      {nearby.map((p) => {
        const c = CAT[p.category ?? 'temple'];
        return (
          <Marker key={'n' + p.id} position={[p.lat, p.lng]} icon={circle(26, dark ? '#1E255A' : '#fff', c.color, iconSpan(c.icon, 15), c.color, true)}>
            <Tooltip direction="top" offset={[0, -12]}>ใกล้เส้นทาง · {p.name}</Tooltip>
          </Marker>
        );
      })}
      {line.length > 1 && <>
        <Polyline positions={line} pathOptions={{ color: '#2F8466', weight: 14, opacity: 0.12 }} />
        <Polyline positions={line} pathOptions={{ color: '#2F8466', weight: 3.5 }} />
      </>}
      {stops.map((s, i) => (
        <Marker key={'s' + i} position={[s.lat, s.lng]} zIndexOffset={1000}
          icon={i === 0 || i === stops.length - 1 ? circle(22, '#2F8466', '#fff', String(i + 1)) : L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: `<div style="width:22px;height:22px;border-radius:5px;background:#fff;border:2.5px solid #1C1D3B;color:#1C1D3B;display:grid;place-items:center;font:700 11px var(--font-anuphan)">${i + 1}</div>` })}>
          <Tooltip direction="top" offset={[0, -14]}>{s.name}</Tooltip>
        </Marker>
      ))}
      {pin && (
        <Marker position={[pin.lat, pin.lng]} draggable zIndexOffset={3000}
          eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onPick?.(ll.lat, ll.lng); } }} />
      )}
    </MapContainer>
  );
}
