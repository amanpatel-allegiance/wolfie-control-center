export default function Loading() {
  return <div className="space-y-4" aria-label="Loading dashboard"><div className="skeleton h-7 w-56"/><div className="skeleton h-4 w-[min(520px,80vw)]"/><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-[105px]"/>)}</div><div className="skeleton h-[360px]"/></div>;
}
