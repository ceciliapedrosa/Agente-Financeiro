export const cents = (value: number) => Math.round(value * 100);
export const money = (value: number) => cents(value) / 100;
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function monthPeriod(input?: string) {
  const key =
    input &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(input) &&
    +input.slice(0, 4) >= 1900 &&
    +input.slice(0, 4) <= 9998
      ? input
      : todayISO().slice(0, 7);
  const start = new Date(`${key}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(start);
  return { key, start, end, label };
}
export type FinancialPayment = {
  amount: number;
  paidAmount: number | null;
  status: string;
};
export function paidValue(p: FinancialPayment) {
  return p.status === "PAID"
    ? p.amount
    : Math.min(p.amount, Math.max(0, p.paidAmount ?? 0));
}
export function remaining(p: FinancialPayment) {
  return money(p.amount - paidValue(p));
}
export function totals(
  payments: FinancialPayment[],
  receipts: { amount: number }[],
) {
  const expenses = payments.reduce((sum, p) => sum + cents(p.amount), 0) / 100;
  const paid = payments.reduce((sum, p) => sum + cents(paidValue(p)), 0) / 100;
  const income = receipts.reduce((sum, r) => sum + cents(r.amount), 0) / 100;
  return {
    expenses,
    paid,
    income,
    pending: money(expenses - paid),
    projected: money(income - expenses),
  };
}
export function paymentState(amount: number, paid: number) {
  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(paid) ||
    cents(amount) <= 0 ||
    cents(paid) < 0 ||
    cents(paid) > cents(amount)
  )
    throw new Error("O valor pago deve estar entre zero e o valor da conta.");
  return cents(paid) === 0
    ? "PENDING"
    : cents(paid) === cents(amount)
      ? "PAID"
      : "PARTIAL";
}
