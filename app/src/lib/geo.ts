// Plot area without a network: GPS corners or counted paces.

export interface LatLon {
  lat: number;
  lon: number;
  /** GPS horizontal accuracy, metres (1 SD-ish, as the browser reports it). */
  accuracy_m?: number;
}

const EARTH_R = 6_371_008.8;

/** Polygon area in m2 from corners walked in order (local equirectangular projection; fine for plots under a few km). */
export function polygonAreaM2(pts: LatLon[]): number {
  if (pts.length < 3) return 0;
  const lat0 = (pts.reduce((s, p) => s + p.lat, 0) / pts.length) * (Math.PI / 180);
  const xy = pts.map((p) => ({
    x: EARTH_R * (p.lon * Math.PI) / 180 * Math.cos(lat0),
    y: EARTH_R * (p.lat * Math.PI) / 180,
  }));
  let a = 0;
  for (let i = 0; i < xy.length; i++) {
    const j = (i + 1) % xy.length;
    a += xy[i]!.x * xy[j]!.y - xy[j]!.x * xy[i]!.y;
  }
  return Math.abs(a) / 2;
}

export function centroid(pts: LatLon[]): LatLon | null {
  if (pts.length === 0) return null;
  return { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length };
}

/**
 * Rough relative error of a GPS polygon area: corner error (m) x perimeter / area.
 * A 30 m square walked with 5 m GPS error is about +/-33%: tell the farmer, offer paces.
 */
export function gpsAreaRelError(pts: LatLon[]): number | null {
  const area = polygonAreaM2(pts);
  if (area <= 0) return null;
  const acc = pts.reduce((s, p) => s + (p.accuracy_m ?? 10), 0) / pts.length;
  let perim = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    perim += polygonDistanceM(a, b);
  }
  return (acc * perim) / area;
}

function polygonDistanceM(a: LatLon, b: LatLon): number {
  const lat0 = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dx = EARTH_R * ((b.lon - a.lon) * Math.PI) / 180 * Math.cos(lat0);
  const dy = EARTH_R * ((b.lat - a.lat) * Math.PI) / 180;
  return Math.hypot(dx, dy);
}

/** One adult walking pace, metres. DEMO ASSUMPTION: an extension officer can calibrate it on a measured 10 m. */
export const PACE_M = 0.75;

export function pacesAreaM2(lengthPaces: number, widthPaces: number, paceM = PACE_M): number {
  return lengthPaces * paceM * widthPaces * paceM;
}

export const M2_PER_ACRE = 4046.8564224;
