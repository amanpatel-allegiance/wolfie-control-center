export function describeCron(expression: string | null): string {
  if (!expression) return "Not scheduled";
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;
  const [minute, hour, day, month, weekday] = parts;
  if (day === "*" && month === "*" && weekday === "*") {
    if (hour === "*" && /^\*\/\d+$/.test(minute)) return `Every ${minute.slice(2)} minutes`;
    if (/^\*\/\d+$/.test(hour) && /^\d+$/.test(minute)) return `Every ${hour.slice(2)} hours at :${minute.padStart(2, "0")}`;
    if (/^\d+$/.test(hour) && /^\d+$/.test(minute)) return `Daily at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  return expression;
}

type CronParts = {
  minute: Set<number>;
  hour: Set<number>;
  day: Set<number>;
  month: Set<number>;
  weekday: Set<number>;
  dayRestricted: boolean;
  weekdayRestricted: boolean;
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function expandField(value: string, min: number, max: number, sundayAlias = false): Set<number> | null {
  const result = new Set<number>();
  for (const segment of value.split(",")) {
    const [rangePart, stepPart] = segment.split("/");
    const step = stepPart == null ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step <= 0) return null;

    let start = min;
    let end = max;
    if (rangePart !== "*") {
      const [startPart, endPart] = rangePart.split("-");
      start = Number(startPart);
      end = endPart == null ? start : Number(endPart);
      if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
    }
    if (start < min || end > max || start > end) return null;
    for (let current = start; current <= end; current += step) {
      result.add(sundayAlias && current === 7 ? 0 : current);
    }
  }
  return result;
}

function parseCron(expression: string | null): CronParts | null {
  const fields = expression?.trim().split(/\s+/);
  if (!fields || fields.length !== 5) return null;
  const [minuteValue, hourValue, dayValue, monthValue, weekdayValue] = fields;
  const minute = expandField(minuteValue, 0, 59);
  const hour = expandField(hourValue, 0, 23);
  const day = expandField(dayValue, 1, 31);
  const month = expandField(monthValue, 1, 12);
  const weekday = expandField(weekdayValue, 0, 7, true);
  if (!minute || !hour || !day || !month || !weekday) return null;
  return {
    minute,
    hour,
    day,
    month,
    weekday,
    dayRestricted: dayValue !== "*",
    weekdayRestricted: weekdayValue !== "*",
  };
}

function zonedParts(date: Date, timeZone: string) {
  try {
    const values = Object.fromEntries(
      formatterFor(timeZone)
        .formatToParts(date)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const year = values.year;
    const month = values.month;
    const day = values.day;
    return {
      minute: values.minute,
      hour: values.hour,
      day,
      month,
      weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    };
  } catch {
    return null;
  }
}

function cronMatches(parts: CronParts, date: Date, timeZone: string) {
  const local = zonedParts(date, timeZone);
  if (!local) return false;
  const dayMatches = parts.day.has(local.day);
  const weekdayMatches = parts.weekday.has(local.weekday);
  const calendarMatches = parts.dayRestricted && parts.weekdayRestricted
    ? dayMatches || weekdayMatches
    : dayMatches && weekdayMatches;
  return parts.minute.has(local.minute) && parts.hour.has(local.hour) && parts.month.has(local.month) && calendarMatches;
}

/** Return the next real occurrence of a standard five-field cron expression. */
export function nextCronOccurrence(expression: string | null, timeZone: string, after = new Date()): Date | null {
  const parts = parseCron(expression);
  if (!parts) return null;
  const start = Math.floor(after.getTime() / 60_000) * 60_000 + 60_000;
  const maxMinutes = 370 * 24 * 60;
  for (let offset = 0; offset < maxMinutes; offset += 1) {
    const candidate = new Date(start + offset * 60_000);
    if (cronMatches(parts, candidate, timeZone)) return candidate;
  }
  return null;
}

/** Return cron occurrences in an absolute time window, capped for dense schedules. */
export function cronOccurrencesBetween(expression: string | null, timeZone: string, start: Date, end: Date, limit = 100): Date[] {
  const occurrences: Date[] = [];
  let cursor = new Date(start.getTime() - 60_000);
  while (occurrences.length < limit) {
    const next = nextCronOccurrence(expression, timeZone, cursor);
    if (!next || next >= end) break;
    if (next >= start) occurrences.push(next);
    cursor = next;
  }
  return occurrences;
}
