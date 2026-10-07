export type Frequency = "NONE" | "MONTHLY" | "YEARLY";
export function calendarDate(value: string) {
  const date = new Date(value + "T12:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error("Informe uma data válida.");
  return date;
}
export function occurrenceDates(
  start: string,
  frequency: Frequency,
  count = 12,
  end?: string,
): string[] {
  const origin = calendarDate(start);
  if (frequency === "NONE") return [start];
  if (!["MONTHLY", "YEARLY"].includes(frequency))
    throw new Error("Frequência inválida.");
  if (!Number.isInteger(count) || count < 2 || count > 60)
    throw new Error("Escolha entre 2 e 60 lançamentos.");
  if (end) {
    calendarDate(end);
    if (end < start)
      throw new Error("O término deve ser igual ou posterior à primeira data.");
  }
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const month = origin.getUTCMonth() + i * (frequency === "YEARLY" ? 12 : 1);
    const first = new Date(Date.UTC(origin.getUTCFullYear(), month, 1, 12));
    if (first.getUTCFullYear() > 9999)
      throw new Error("O período ultrapassa o limite de datas.");
    const lastDay = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
    ).getUTCDate();
    first.setUTCDate(Math.min(origin.getUTCDate(), lastDay));
    const next = first.toISOString().slice(0, 10);
    if (end && next > end) break;
    dates.push(next);
  }
  return dates;
}
