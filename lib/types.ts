export type CategoryKey = 'temple' | 'cafe' | 'food' | 'stay' | 'nature' | 'market' | 'view' | 'museum' | 'gift';
export type CityKey = 'lp' | 'vte' | 'vv' | 'pakse' | 'other';

export interface Place {
  id: string;
  name: string;
  category: CategoryKey;
  city: CityKey;
  lat: number;
  lng: number;
  open_hours: string | null;   // "08:00–17:00"
  fee: string | null;          // "20,000 กีบ"
  duration_min: number;        // เวลาแนะนำ
  description: string | null;
  photos: string[];
}

export interface Trip {
  id: string;
  code: string;                // TR-2569-118
  name: string;
  client_name: string;
  pax: number;
  start_date: string;          // ISO date
  day_start_min: number;       // 540 = 09:00
  share_token: string | null;
  days: string[][];            // place ids per day, in order (assembled from trip_stops)
}

export interface ScheduledStop {
  place: Place;
  index: number;
  startMin: number;
  endMin: number;
  waitMin: number;
  closesBeforeEnd: boolean;
  leg: Leg | null;
}
export interface Leg { km: number; min: number; walk: boolean }
export interface NearbyHit { place: Place; distanceKm: number; segment: number }
