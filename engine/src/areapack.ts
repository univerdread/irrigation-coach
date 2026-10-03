// Offline lookup into an area data pack (contracts/schemas/area-pack.schema.json).

export interface AreaPackLayer {
  encoding: 'uint8';
  transform: { kind: 'linear'; scale: number; offset: number } | { kind: 'expm1_div10' };
  nodata: number;
  unit?: string;
  data_b64: string;
  source: string;
  note?: string;
}

export interface AreaPack {
  schema_version: '0.1.0';
  area_id: string;
  name: string;
  built_at: string;
  simulated?: boolean;
  grid: { west: number; north: number; cell_deg: number; width: number; height: number };
  layers: Record<string, AreaPackLayer>;
  climatology: { source: string; lat: number; lon: number; tmax_c: number[]; tmin_c: number[]; rain_mm_per_day: number[] };
  licenses: string[];
}

export interface AreaLookup {
  row: number;
  col: number;
  /** Physical values per layer; null where the pack has no data. */
  values: Record<string, number | null>;
}

const decoded = new WeakMap<AreaPackLayer, Uint8Array>();

function bytes(layer: AreaPackLayer): Uint8Array {
  let b = decoded.get(layer);
  if (!b) {
    const s = atob(layer.data_b64);
    b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    decoded.set(layer, b);
  }
  return b;
}

export function decodeValue(layer: AreaPackLayer, x: number): number | null {
  if (x === layer.nodata) return null;
  return layer.transform.kind === 'linear' ? x * layer.transform.scale + layer.transform.offset : Math.expm1(x / 10);
}

/** Values at a GPS point, or null if the point is outside the pack. */
export function lookupAreaPack(pack: AreaPack, lat: number, lon: number): AreaLookup | null {
  const g = pack.grid;
  const col = Math.floor((lon - g.west) / g.cell_deg);
  const row = Math.floor((g.north - lat) / g.cell_deg);
  if (col < 0 || row < 0 || col >= g.width || row >= g.height) return null;
  const i = row * g.width + col;
  const values: Record<string, number | null> = {};
  for (const [name, layer] of Object.entries(pack.layers)) {
    const b = bytes(layer);
    values[name] = i < b.length ? decodeValue(layer, b[i]!) : null;
  }
  return { row, col, values };
}
