export function parseBRMoney(raw: string): number | null {
  const value = raw.trim().replace(/^R\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) return null;
  const number = Number(value.replaceAll(".", "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}
export function formatBRMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
export function parseBRDate(raw: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (!m) return "";
  const iso = `${m[3]}-${m[2]}-${m[1]}`,
    d = new Date(iso + "T12:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : "";
}
export function formatBRDate(iso: string) {
  return iso ? iso.split("-").reverse().join("/") : "";
}

export function maskDateInput(raw: string, monthOnly = false): string {
  const digits = raw.replace(/\D/g, "").slice(0, monthOnly ? 6 : 8);
  if (monthOnly) return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  return digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}
