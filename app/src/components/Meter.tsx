interface Props {
  label: string;
  /** 0..1+ share of the limit used. */
  load: number;
  detail: string;
  flagged: boolean;
  flagText: string;
}

/** A single ratio against a limit: fill on a lighter track of the same hue; over the limit turns to the warning tone with a text label. */
export function Meter({ label, load, detail, flagged, flagText }: Props) {
  const pct = Math.min(100, Math.round(load * 100));
  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-label">{label}</span>
        <span className="meter-detail">{detail}</span>
      </div>
      <div className={flagged ? 'meter-track over' : 'meter-track'} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      {flagged && <p className="meter-flag">⚠ {flagText}</p>}
    </div>
  );
}
