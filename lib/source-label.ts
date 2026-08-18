const SOURCE_LABELS: Record<string, { full: string; compact: string }> = {
  adi: { full: "Abu Dhabi DARI", compact: "ADI" },
  ajman: { full: "Ajman Open Data", compact: "Open Data" },
  dld: { full: "Dubai Land Department", compact: "DLD" },
  geniemap: { full: "Genie Maps", compact: "Genie Maps" },
  sharjah: { full: "Sharjah Municipality", compact: "Municipality" },
};

function fallbackLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function sourceLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  return SOURCE_LABELS[normalized]?.full ?? fallbackLabel(value);
}

export function compactSourceLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  return SOURCE_LABELS[normalized]?.compact ?? fallbackLabel(value);
}
