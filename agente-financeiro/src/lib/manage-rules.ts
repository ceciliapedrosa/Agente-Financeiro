import { calendarDate } from "./recurrence";
export function overdueDays(expected: Date | string, today: string) {
  return Math.max(
    0,
    Math.round(
      (calendarDate(today).getTime() -
        calendarDate(new Date(expected).toISOString().slice(0, 10)).getTime()) /
        86400000,
    ),
  );
}
export function shiftedDate(original: Date, anchor: Date, replacement: string) {
  const date = calendarDate(replacement),
    day = date.getUTCDate();
  const offset =
    (original.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    original.getUTCMonth() -
    anchor.getUTCMonth();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + offset);
  const last = new Date(date);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  date.setUTCDate(Math.min(day, last.getUTCDate()));
  if (date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 9998)
    throw new Error("Data fora do intervalo permitido.");
  return date;
}
export function inScope(
  row: { id: string; seriesIndex: number | null },
  anchor: { id: string; seriesIndex: number | null },
  scope: string,
) {
  return scope === "ONE"
    ? row.id === anchor.id
    : scope === "ALL" || (row.seriesIndex ?? 0) >= (anchor.seriesIndex ?? 0);
}
