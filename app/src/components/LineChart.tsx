// Small dependency-free line chart (offline). Follows the dataviz rules: one y-axis, 2px lines,
// hairline solid grid, emphasis colour for the series that matters, legend for >= 2 series,
// selective end labels, crosshair tooltip with every series, keyboard access, and a table view.
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
  /** Indices to mark with a dot (e.g. watering days), each with a tooltip note. */
  markers?: { index: number; note: string }[];
}

interface Props {
  title: string;
  subtitle?: string;
  series: ChartSeries[];
  xLabel: (index: number) => string;
  yFormat: (v: number) => string;
  /** Short unit for end labels and tooltip values, e.g. "m³". */
  unit: string;
  refLines?: { y: number; label: string }[];
  events?: { index: number; label: string }[];
  height?: number;
  tableLabel: string;
  xHeader: string;
}

const M = { top: 14, right: 64, bottom: 26, left: 40 };

/** Clean axis: a step of 1, 2 or 5 x 10^n giving 3-5 intervals, so ticks never read "12.5" or "38". */
export function niceTicks(max: number): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 1e6; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export function LineChart({ title, subtitle, series, xLabel, yFormat, unit, refLines = [], events = [], height = 220, tableLabel, xHeader }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = Math.max(...series.map((s) => s.values.length));
  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values), ...refLines.map((r) => r.y)) * 1.02);
  const yMax = ticks.at(-1)!;
  const iw = Math.max(10, width - M.left - M.right);
  const ih = height - M.top - M.bottom;
  const x = (i: number) => M.left + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const y = (v: number) => M.top + ih - (v / yMax) * ih;
  const xTicks = [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];

  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  // End labels only where they don't collide; otherwise the legend and tooltip carry identity.
  const ends = series.map((s) => ({ s, yy: y(s.values.at(-1) ?? 0) }));
  const showEnd = (k: number) => ends.every((e, j) => j === k || Math.abs(e.yy - ends[k]!.yy) >= 16 || j > k);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const px = e.clientX - r.left;
    setHover(Math.max(0, Math.min(n - 1, Math.round((px / r.width) * (n - 1)))));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
    else if (e.key === 'ArrowLeft') setHover((h) => Math.max(0, (h ?? n) - 1));
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };
  useEffect(() => setHover(null), [n]);

  const tipLeft = hover === null ? 0 : Math.min(Math.max(x(hover) - 80, 0), width - 160);

  return (
    <figure className="chart">
      <figcaption>
        <span className="chart-title">{title}</span>
        {subtitle && <span className="chart-sub">{subtitle}</span>}
      </figcaption>
      {series.length > 1 && (
        <ul className="legend" aria-hidden="true">
          {series.map((s) => (
            <li key={s.id}>
              <span className="key-line" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div
        className="chart-box"
        ref={box}
        tabIndex={0}
        role="img"
        aria-label={`${title}. ${series.map((s) => `${s.label}: ${yFormat(s.values.at(-1) ?? 0)} ${unit} by ${xLabel(n - 1)}`).join('. ')}`}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={height} className="chart-svg">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={M.left + iw} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
              <text x={M.left - 6} y={y(t) + 4} className="tick" textAnchor="end">
                {yFormat(t)}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={height - 8} className="tick" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {xLabel(i)}
            </text>
          ))}
          {refLines.map((r) => (
            <g key={r.label}>
              <line x1={M.left} x2={M.left + iw} y1={y(r.y)} y2={y(r.y)} className="ref" />
              <text x={M.left + 4} y={y(r.y) - 5} className="ref-label">
                {r.label}
              </text>
            </g>
          ))}
          {events.map((ev) => (
            <g key={ev.index}>
              <line x1={x(ev.index)} x2={x(ev.index)} y1={M.top} y2={M.top + ih} className="event" />
              <text x={x(ev.index) + 4} y={M.top + 10} className="ref-label">
                {ev.label}
              </text>
            </g>
          ))}
          {series.map((s) => (
            <path key={s.id} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {series.map((s) =>
            (s.markers ?? []).map((m) => (
              <circle key={`${s.id}-${m.index}`} cx={x(m.index)} cy={y(s.values[m.index] ?? 0)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            )),
          )}
          {ends.map(({ s, yy }, k) =>
            showEnd(k) ? (
              <text key={s.id} x={M.left + iw + 6} y={yy + 4} className="end-label">
                {yFormat(s.values.at(-1) ?? 0)} {unit}
              </text>
            ) : null,
          )}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} className="crosshair" />
              {series.map((s) => (
                <circle key={s.id} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
              ))}
            </g>
          )}
          <rect
            x={M.left}
            y={M.top}
            width={iw}
            height={ih}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
            style={{ touchAction: 'pan-y' }}
          />
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: tipLeft }} aria-live="polite">
            <div className="tip-x">{xLabel(hover)}</div>
            {series.map((s) => (
              <div key={s.id} className="tip-row">
                <span className="key-line" style={{ background: s.color }} />
                <strong>
                  {yFormat(s.values[hover] ?? 0)} {unit}
                </strong>
                <span className="tip-name">{s.label}</span>
              </div>
            ))}
            {series.flatMap((s) => (s.markers ?? []).filter((m) => m.index === hover).map((m) => <div key={s.id + m.index} className="tip-note">{m.note}</div>))}
          </div>
        )}
      </div>
      <details className="table-view">
        <summary>{tableLabel}</summary>
        <table>
          <thead>
            <tr>
              <th>{xHeader}</th>
              {series.map((s) => (
                <th key={s.id}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: n }, (_, i) => (
              <tr key={i}>
                <td>{xLabel(i)}</td>
                {series.map((s) => (
                  <td key={s.id}>{yFormat(s.values[i] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
