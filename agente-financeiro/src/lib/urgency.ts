import { todayISO, remaining, type FinancialPayment } from "./finance";
export type Urgency = "OVERDUE" | "TODAY" | "UPCOMING" | "FUTURE" | "PAID";
export function urgency(
  p: FinancialPayment & { dueDate: Date },
  today = todayISO(),
): Urgency {
  if (remaining(p) <= 0) return "PAID";
  const due = p.dueDate.toISOString().slice(0, 10);
  if (due < today) return "OVERDUE";
  if (due === today) return "TODAY";
  const end = new Date(today + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + 7);
  return due <= end.toISOString().slice(0, 10) ? "UPCOMING" : "FUTURE";
}
export const urgencyLabels: Record<Urgency, string> = {
  OVERDUE: "Atrasado",
  TODAY: "Vence hoje",
  UPCOMING: "Próximos 7 dias",
  FUTURE: "A vencer",
  PAID: "Pago",
};
