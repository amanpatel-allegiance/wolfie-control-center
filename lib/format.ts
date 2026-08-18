export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatRelative(iso: string | null | undefined, now = new Date()): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = now.getTime() - then;
  const future = diffMs < 0;
  const s = Math.abs(Math.round(diffMs / 1000));
  const relative = (value: string) => future ? `in ${value}` : `${value} ago`;
  if (s < 10) return "just now";
  if (s < 60) return relative(`${s}s`);
  if (s < 3600) return relative(`${Math.floor(s / 60)}m`);
  if (s < 86400) return relative(`${Math.floor(s / 3600)}h`);
  const days = Math.floor(s / 86400);
  if (days < 30) return relative(`${days}d`);
  const months = Math.floor(days / 30);
  return relative(`${months}mo`);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function formatUtc(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

/** Redact common secret shapes from error strings. Defense in depth. */
export function redactSecrets(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/eyJ[\w-]{20,}\.[\w-]{10,}\.[\w-]+/g, "[jwt-redacted]")
    .replace(/(sk-[A-Za-z0-9_-]{16,})/g, "[api-key-redacted]")
    .replace(/(ghp_[A-Za-z0-9]{20,})/g, "[gh-pat-redacted]")
    .replace(/(bearer\s+)[A-Za-z0-9_.\-]+/gi, "$1[redacted]")
    .replace(/(authorization[:=]\s*)[A-Za-z0-9._\-]+/gi, "$1[redacted]")
    .replace(/(supabase[_-]service[_-]role[_-]key[:=]\s*)\S+/gi, "$1[redacted]")
    .replace(/(password[:=]\s*)\S+/gi, "$1[redacted]")
    .replace(/(:\/\/[^:@\/]+:)[^@\/]+@/g, "$1[redacted]@"); // url embedded creds
}
