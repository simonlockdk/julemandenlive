/** Geometri til kortlinjer: fløjet rute, planlagt rute og stop. */
import { greatCirclePath, interpolateGreatCircle } from '@shared/geo';
import type { FlightPlan, SleighState } from '@shared/tracking';

type Coord = [number, number];

/** Gør en linje sammenhængende over datolinjen (ingen spring på ±360°). */
function unwrap(coords: Coord[]): Coord[] {
  const out: Coord[] = [];
  let prev: number | null = null;
  for (const [lon0, lat] of coords) {
    let lon = lon0;
    if (prev !== null) {
      while (lon - prev > 180) lon -= 360;
      while (lon - prev < -180) lon += 360;
    }
    prev = lon;
    out.push([lon, lat]);
  }
  return out;
}

const legCache = new WeakMap<FlightPlan, Coord[][]>();

function legPaths(f: FlightPlan): Coord[][] {
  let legs = legCache.get(f);
  if (!legs) {
    legs = [];
    for (let i = 0; i < f.stops.length - 1; i++) legs.push(greatCirclePath(f.stops[i]!, f.stops[i + 1]!, 120));
    legCache.set(f, legs);
  }
  return legs;
}

export interface RouteGeo {
  flown: GeoJSON.Feature<GeoJSON.LineString>;
  planned: GeoJSON.Feature<GeoJSON.LineString>;
  stops: GeoJSON.FeatureCollection<GeoJSON.Point>;
}

const line = (coords: Coord[]): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: coords.length > 1 ? unwrap(coords) : [] },
});

/**
 * Bygger kortgeometri for en flyvning ved tid t.
 * - `state` er kanens tilstand (hvis flyvningen er aktiv)
 */
export function buildRouteGeo(f: FlightPlan | null, state: SleighState | null, t: number): RouteGeo {
  const empty: RouteGeo = {
    flown: line([]),
    planned: line([]),
    stops: { type: 'FeatureCollection', features: [] },
  };
  if (!f) return empty;
  const legs = legPaths(f);
  const active = state?.flight?.id === f.id;
  const k = active ? state!.stopIndex : t >= f.stops[f.stops.length - 1]!.arrive ? legs.length : -1;

  const flown: Coord[] = [];
  const planned: Coord[] = [];
  legs.forEach((leg, i) => {
    if (i < k) flown.push(...leg);
    else if (i > k) planned.push(...leg);
    else if (active && state!.mode === 'flying') {
      // delvis strækning: fra stoppet til kanens position og videre
      const a = f.stops[i]!;
      const b = f.stops[i + 1]!;
      const pos: Coord = [state!.lon, state!.lat];
      const partA: Coord[] = [];
      const steps = 24;
      const frac = state!.legProgress;
      for (let s = 0; s <= steps; s++) {
        const p = interpolateGreatCircle(a, b, (s / steps) * frac);
        partA.push([p.lon, p.lat]);
      }
      flown.push(...partA, pos);
      planned.push(pos);
      for (let s = 1; s <= steps; s++) {
        const p = interpolateGreatCircle(a, b, frac + (s / steps) * (1 - frac));
        planned.push([p.lon, p.lat]);
      }
    } else {
      planned.push(...leg);
    }
  });

  const stops: GeoJSON.Feature<GeoJSON.Point>[] = f.stops
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.kind === 'city')
    .map(({ s, i }) => {
      const status = t >= s.depart ? 'visited' : t >= s.arrive ? 'current' : 'upcoming';
      return {
        type: 'Feature' as const,
        id: i,
        properties: { id: s.id, name: s.name, status, idx: i },
        geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
      };
    });

  return { flown: line(flown), planned: line(planned), stops: { type: 'FeatureCollection', features: stops } };
}

/** Punkt et stykke foran kanen – bruges til at vende grafikken i flyveretningen. */
export function pointAhead(lat: number, lon: number, bearingDeg: number, km = 60): Coord {
  const R = 6371;
  const δ = km / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return [((λ2 * 180) / Math.PI + 540) % 360 - 180, (φ2 * 180) / Math.PI];
}

/** Polarkappen: et område nord for 84,5° (vektorkortene slutter ved ~85°). */
export function polarCap(): GeoJSON.Feature<GeoJSON.Polygon> {
  const ring: Coord[] = [];
  for (let lon = -180; lon <= 180; lon += 4) ring.push([lon, 84.2]);
  ring.push([180, 90], [-180, 90], [-180, 84.2]);
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
