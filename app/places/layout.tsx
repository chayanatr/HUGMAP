import type { ReactNode } from 'react';
import { MapProvider } from '@/components/MapProvider';

export default function PlacesLayout({ children }: { children: ReactNode }) {
  return <MapProvider>{children}</MapProvider>;
}
