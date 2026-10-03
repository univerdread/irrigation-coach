interface Props {
  label: string;
  value: string;
  /** Comparison line, e.g. "vs 500 m³ watering daily". */
  compare?: string;
  /** Signed change with its meaning; good = the direction we want. */
  delta?: { text: string; good: boolean };
}

export function StatTile({ label, value, compare, delta }: Props) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {compare && <span className="stat-compare">{compare}</span>}
      {delta && <span className={delta.good ? 'stat-delta good' : 'stat-delta bad'}>{delta.text}</span>}
    </div>
  );
}
