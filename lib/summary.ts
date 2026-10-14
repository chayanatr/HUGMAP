import { fmtThaiRange } from './format';
import { nearbyAlongRoute, nearestSegment, placeHit, routePoints, schedule } from './geo';
import type { DayData, TripData } from './trips';
import type { Endpoint, Leg, NearbyHit, Place, ScheduledStop, Trip } from './types';

/** ข้อมูลหน้าสรุป — serializable (ส่งจาก server component ไป client ได้) */
export interface SummaryDay {
  id: string;
  dayNo: number;
  places: Place[];
  /** ระยะ/เวลาแต่ละช่วงจาก Google Routes (null = ใช้ค่าประมาณ) */
  legs: Leg[] | null;
  /** จุดรับ/ส่งลูกค้าของวัน */
  start: Endpoint | null;
  end: Endpoint | null;
  /** ช่วงจุดรับ → จุดแวะแรก (null = ใช้ค่าประมาณ) */
  startLeg: Leg | null;
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
    const hasRoute = dayPlaces.length > 0 || (!!d.start && !!d.end);
    const pts = routePoints(d.start, dayPlaces, d.end);
    const n = dayPlaces.length;
    const nearby: NearbyHit[] = !hasRoute
      ? []
      : road
        ? road.flatMap((h) => {
            const place = placeMap.get(h.id);
            return place ? [placeHit({ place, distanceKm: h.distanceKm, segment: nearestSegment(place, pts) }, n, !!d.start, !!d.end)] : [];
          })
        : nearbyAlongRoute(pts, places, radiusKm, inTrip).map((h) => placeHit(h, n, !!d.start, !!d.end));
    return {
      id: d.id, dayNo: d.dayNo, places: dayPlaces, start: d.start, end: d.end,
      startLeg: complete ? (d.route?.startLeg ?? null) : null,
      legs: complete ? (d.route?.legs ?? null) : null,
      line: d.route?.line ?? null, nearby,
    };
  });  return { trip: tripData.trip, radiusKm, days };
}

export interface DayView extends SummaryDay {
  stops: ScheduledStop[];
  km: number;
  travelMin: number;
  firstMin: number | null;
  lastMin: number | null;
  /** เวลาถึงจุดส่ง (null = ไม่มีจุดส่ง) */
  arriveMin: number | null;
}

/** คำนวณตารางเวลารายวันและยอดรวม */
export function summarize(data: SummaryData) {
  const days: DayView[] = data.days.map((d) => {
    const s = schedule(d.places, data.trip.day_start_min, d.legs ?? undefined, { start: d.start, end: d.end, startLeg: d.startLeg });
    return { ...d, stops: s.stops, km: s.km, travelMin: s.travelMin, firstMin: s.firstMin, lastMin: s.lastMin, startLeg: s.startLeg, arriveMin: s.arriveMin };
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
