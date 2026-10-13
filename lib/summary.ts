import { fmtThaiRange } from './format';
import { nearbyAlongRoute, nearestSegment, schedule } from './geo';
import type { DayData, TripData } from './trips';
import type { Leg, NearbyHit, Place, ScheduledStop, Trip } from './types';

/** ข้อมูลหน้าสรุป — serializable (ส่งจาก server component ไป client ได้) */
export interface SummaryDay {
  id: string;
  dayNo: number;
  places: Place[];
  /** ระยะ/เวลาแต่ละช่วงจาก Google Routes (null = ใช้ค่าประมาณ) */
  legs: Leg[] | null;
  /** เส้นทางตามถนน [lat, lng] (null = ลากเส้นตรงระหว่างจุด) */
  line: [number, number][] | null;
  nearby: NearbyHit[];
}

export interface SummaryData {
  trip: Trip;
  radiusKm: number;
  days: SummaryDay[];
}

export type RoadHits = Record<string, { id: string; distanceKm: number }[] | undefined>;

/** รวมทริป + สถานที่ทั้งหมด + ผล RPC ใกล้เส้นทาง (ถ้ามี) เป็นข้อมูลหน้าสรุป */
export function buildSummaryData({
  tripData,
  places,
  radiusKm,
  roadHits = {},
}: {
  tripData: TripData;
  places: Place[];
  radiusKm: number;
  roadHits?: RoadHits;
}): SummaryData {
  const placeMap = new Map(places.map((p) => [p.id, p]));
  const inTrip = new Set(tripData.days.flatMap((d) => d.placeIds));
  const days = tripData.days.map((d: DayData): SummaryDay => {
    const dayPlaces = d.placeIds.flatMap((id) => placeMap.get(id) ?? []);
    const complete = dayPlaces.length === d.placeIds.length;
    const road = roadHits[d.id];
    const nearby: NearbyHit[] = !dayPlaces.length
      ? []
      : road
        ? road.flatMap((h) => {
            const place = placeMap.get(h.id);
            return place ? [{ place, distanceKm: h.distanceKm, segment: nearestSegment(place, dayPlaces) }] : [];
          })
        : nearbyAlongRoute(dayPlaces, places, radiusKm, inTrip);
    return { id: d.id, dayNo: d.dayNo, places: dayPlaces, legs: complete ? (d.route?.legs ?? null) : null, line: d.route?.line ?? null, nearby };
  });
  return { trip: tripData.trip, radiusKm, days };
}

export interface DayView extends SummaryDay {
  stops: ScheduledStop[];
  km: number;
  travelMin: number;
  firstMin: number | null;
  lastMin: number | null;
}

/** คำนวณตารางเวลารายวันและยอดรวม */
export function summarize(data: SummaryData) {
  const days: DayView[] = data.days.map((d) => {
    const s = schedule(d.places, data.trip.day_start_min, d.legs ?? undefined);
    return { ...d, stops: s.stops, km: s.km, travelMin: s.travelMin, firstMin: s.firstMin, lastMin: s.lastMin };
  });
  return {
    days,
    totals: {
      days: days.length,
      stops: days.reduce((n, d) => n + d.stops.length, 0),
      km: days.reduce((n, d) => n + d.km, 0),
      travelMin: days.reduce((n, d) => n + d.travelMin, 0),
    },
    range: fmtThaiRange(data.trip.start_date, days.length),
  };
}
