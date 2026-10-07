import { urgency, urgencyLabels } from "@/lib/urgency";
import type { FinancialPayment } from "@/lib/finance";
import { AlertTriangle, Clock } from "lucide-react";
export default function DueBadge({
  payment,
}: {
  payment: FinancialPayment & { dueDate: Date };
}) {
  const kind = urgency(payment);
  return (
    <span className={`due-badge due-${kind.toLowerCase()}`}>
      {kind === "OVERDUE" ? (
        <AlertTriangle size={13} aria-hidden="true" />
      ) : kind === "TODAY" ? (
        <Clock size={13} aria-hidden="true" />
      ) : null}
      {urgencyLabels[kind]}
    </span>
  );
}
