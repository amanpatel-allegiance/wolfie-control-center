import type { DailyStats } from "@/lib/types";

export function RunSuccessTrend({ rows }: { rows: DailyStats[] }) {
  const byDay = new Map<string, { day: string; succeeded: number; total: number }>();
  for (const row of rows) {
    const item = byDay.get(row.day) ?? { day: row.day, succeeded: 0, total: 0 };
    item.succeeded += row.succeeded;
    item.total += row.total;
    byDay.set(row.day, item);
  }

  const data = [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((item) => ({ ...item, rate: item.total ? Math.round((item.succeeded / item.total) * 100) : null }))
    .filter((item): item is typeof item & { rate: number } => item.rate != null);

  if (!data.length) return <div className="empty-panel min-h-[238px] text-xs text-wolfie-muted">No daily run aggregates are available for this period.</div>;

  const width = 700;
  const top = 18;
  const bottom = 180;
  const x = (index: number) => data.length === 1 ? width / 2 : index * (width / (data.length - 1));
  const y = (rate: number) => bottom - (Math.max(0, Math.min(100, rate)) / 100) * (bottom - top);
  const points = data.map((item, index) => [x(index), y(item.rate)] as const);
  const line = points.map(([px, py], index) => `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`).join(" ");
  const area = data.length > 1 ? `${line} L${width} ${bottom} L0 ${bottom} Z` : "";
  const current = data[data.length - 1];

  return (
    <div className="p-[14px]">
      <svg className="h-[200px] w-full overflow-visible" viewBox={`0 0 ${width} 210`} preserveAspectRatio="none" role="img" aria-label={`Run success rate from ${data[0].day} to ${current.day}; current rate ${current.rate}%`}>
        <defs><linearGradient id="successFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0F9F6E" stopOpacity="0.12"/><stop offset="100%" stopColor="#0F9F6E" stopOpacity="0"/></linearGradient></defs>
        <g stroke="#E6E9ED" strokeWidth="1">{[18, 58.5, 99, 139.5, 180].map((gy) => <path key={gy} d={`M0 ${gy}H${width}`} />)}</g>
        {area && <path d={area} fill="url(#successFill)" />}
        {data.length > 1 && <path d={line} fill="none" stroke="#0F9F6E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        {points.map(([px, py], index) => <circle key={data[index].day} cx={px} cy={py} r={index === points.length - 1 ? 5 : 3} fill={index === points.length - 1 && data[index].rate < 90 ? "#E43D3D" : "#0F9F6E"} stroke="#fff" strokeWidth="2"><title>{`${data[index].day}: ${data[index].rate}% success`}</title></circle>)}
      </svg>
      <div className="flex justify-between text-[11px] text-wolfie-muted"><span>{data[0].day}</span><b className={current.rate < 90 ? "text-state-failed" : "text-state-healthy"}>{current.rate}% current</b></div>
    </div>
  );
}
