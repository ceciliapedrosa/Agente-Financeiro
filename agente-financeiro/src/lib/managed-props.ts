import type { Payment, Receipt, Card } from "@prisma/client";
import type { ManagedRecord } from "@/components/RecordManager";
export function managedProps(row: Payment | Receipt | Card): ManagedRecord {
  const common = {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
  if ("creditLimit" in row)
    return {
      ...common,
      institution: row.institution,
      creditLimit: row.creditLimit,
      closingDay: row.closingDay,
      dueDay: row.dueDay,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      currentInvoice: row.invoiceReviewedAt ? 0 : row.currentInvoice,
    };
  return {
    ...common,
    amount: row.amount,
    priority: "priority" in row ? row.priority : undefined,
    notes: "notes" in row ? row.notes : undefined,
    category: row.category,
    date: ("dueDate" in row ? row.dueDate : row.expectedAt).toISOString(),
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    seriesId: row.seriesId,
    seriesIndex: row.seriesIndex,
    receivedAt:
      "receivedAt" in row ? (row.receivedAt?.toISOString() ?? null) : undefined,
    recurring: "recurring" in row ? row.recurring : row.recurrence !== "NONE",
  };
}
