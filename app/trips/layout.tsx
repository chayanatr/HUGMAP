import type { ReactNode } from 'react';
import { MapProvider } from '@/components/MapProvider';

export default function TripsLayout({ children }: { children: ReactNode }) {
  return <MapProvider>{children}</MapProvider>;
}
