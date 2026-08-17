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
