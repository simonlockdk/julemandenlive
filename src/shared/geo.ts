/** Geografiske hjælpere: storcirkelafstande, kurs og interpolation. */

export interface LatLon {
  lat: number;
  lon: number;
}

const R_EARTH_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Haversine-afstand i km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Startkurs fra a mod b i grader (0 = nord, 90 = øst). */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Punkt på storcirklen mellem a og b ved brøkdel f ∈ [0, 1]. */
export function interpolateGreatCircle(a: LatLon, b: LatLon, f: number): LatLon {
  const φ1 = toRad(a.lat);
  const λ1 = toRad(a.lon);
  const φ2 = toRad(b.lat);
  const λ2 = toRad(b.lon);
  const δ = distanceKm(a, b) / R_EARTH_KM;
  if (δ < 1e-9) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * δ) / Math.sin(δ);
  const B = Math.sin(f * δ) / Math.sin(δ);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  return { lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lon: toDeg(Math.atan2(y, x)) };
}

/**
 * Tætner en storcirkel til en liste af punkter (til kortlinjer).
 * Længdegrader "foldes ud", så linjer over datolinjen tegnes sammenhængende.
 */
export function greatCirclePath(a: LatLon, b: LatLon, stepKm = 150): [number, number][] {
  const n = Math.max(1, Math.ceil(distanceKm(a, b) / stepKm));
  const pts: [number, number][] = [];
  let prevLon: number | null = null;
  for (let i = 0; i <= n; i++) {
    const p = interpolateGreatCircle(a, b, i / n);
    let lon = p.lon;
    if (prevLon !== null) {
      while (lon - prevLon > 180) lon -= 360;
      while (lon - prevLon < -180) lon += 360;
    }
    prevLon = lon;
    pts.push([lon, p.lat]);
  }
  return pts;
}

/** Normaliserer længdegrad til (-180, 180]. */
export function normLon(lon: number): number {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  if (l === -180) l = 180;
  return l;
}

/** Glidende S-kurve – bruges til blød acceleration og nedbremsning. */
export function smoothstep(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Kompaskurs som dansk forkortelse, fx "NØ". */
export function compassDa(deg: number): string {
  const names = ['N', 'NNØ', 'NØ', 'ØNØ', 'Ø', 'ØSØ', 'SØ', 'SSØ', 'S', 'SSV', 'SV', 'VSV', 'V', 'VNV', 'NV', 'NNV'];
  return names[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]!;
}
