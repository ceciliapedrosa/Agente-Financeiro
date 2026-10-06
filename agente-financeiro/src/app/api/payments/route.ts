import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { cents, money, paidValue, paymentState, todayISO } from "@/lib/finance";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(s + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Data inválida.");
const amount = z.coerce
  .number()
  .finite()
  .positive()
  .max(999999999)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
    "Use no máximo duas casas decimais.",
  );
const details = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  amount,
  dueDate: date,
  priority: z.enum(["ESSENTIAL", "HIGH", "MEDIUM", "LOW"]),
  recurrence: z.enum(["NONE", "MONTHLY", "YEARLY"]),
  notes: z.string().max(5000).optional(),
});
const initial = details.extend({
  status: z.enum(["PENDING", "PAID", "PARTIAL"]),
  paidAmount: amount.optional(),
  paidAt: date.optional(),
});
const identity = { id: z.string().min(1), updatedAt: z.string().datetime() };
const change = z.discriminatedUnion("action", [
  details.extend({ ...identity, action: z.literal("edit") }),
  z.object({ ...identity, action: z.literal("payment"), amount, paidAt: date }),
  z.object({ ...identity, action: z.literal("settle"), paidAt: date }),
  z.object({ ...identity, action: z.literal("reopen") }),
]);
class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const asDate = (s: string) => new Date(s + "T12:00:00Z");
function errorResponse(error: unknown) {
  if (error instanceof RequestError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error:
          "Confira os campos: " + error.issues.map((i) => i.message).join(" "),
      },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  console.error(
    "Payment operation failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    { error: "Não foi possível salvar. Tente novamente." },
    { status: 500 },
  );
}
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const d = initial.parse(await req.json());
    const paid =
      d.status === "PAID"
        ? d.amount
        : d.status === "PARTIAL"
          ? (d.paidAmount ?? 0)
          : 0;
    if (
      d.status === "PARTIAL" &&
      (cents(paid) <= 0 || cents(paid) >= cents(d.amount))
    )
      throw new RequestError(
        "O pagamento parcial deve ser maior que zero e menor que o valor da conta.",
      );
    if (paid > 0 && (!d.paidAt || d.paidAt > todayISO()))
      throw new RequestError("Informe uma data de pagamento válida, até hoje.");
    const payment = await db.payment.create({
      data: {
        userId,
        name: d.name,
        category: d.category,
        amount: money(d.amount),
        dueDate: asDate(d.dueDate),
        priority: d.priority,
        recurrence: d.recurrence,
        notes: d.notes || null,
        status: paymentState(d.amount, paid),
        paidAmount: money(paid),
        paidAt: paid ? asDate(d.paidAt!) : null,
        ...(paid
          ? {
              events: {
                create: {
                  amount: money(paid),
                  paidAt: asDate(d.paidAt!),
                  kind: "PAYMENT",
                },
              },
            }
          : {}),
      },
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const d = change.parse(await req.json());
    const result = await db.$transaction(async (tx) => {
      // Serialize mutations to prevent double clicks and concurrent tabs overpaying.
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${d.id} AND "userId" = ${userId} FOR UPDATE`;
      const p = await tx.payment.findFirst({
        where: { id: d.id, userId },
        include: { events: true },
      });
      if (!p) throw new RequestError("Conta não encontrada.", 404);
      if (p.updatedAt.toISOString() !== d.updatedAt)
        throw new RequestError(
          "Esta conta foi alterada em outra sessão. Atualize a página antes de continuar.",
          409,
        );
      const previous = paidValue(p);
      const updatedAt = new Date(
        Math.max(Date.now(), p.updatedAt.getTime() + 1),
      );
      // Keep legacy totals as an explicit opening entry; do not invent old installments.
      if (!p.events.length && previous > 0)
        await tx.paymentEvent.create({
          data: {
            paymentId: p.id,
            amount: previous,
            paidAt: p.paidAt ?? p.updatedAt,
            kind: "LEGACY",
          },
        });
      let data: Prisma.PaymentUpdateInput;
      if (d.action === "edit") {
        if (cents(d.amount) < cents(previous))
          throw new RequestError(
            "O valor da conta não pode ser menor que o total já pago. Reabra a conta para corrigir os pagamentos.",
          );
        data = {
          name: d.name,
          category: d.category,
          amount: money(d.amount),
          dueDate: asDate(d.dueDate),
          priority: d.priority,
          recurrence: d.recurrence,
          notes: d.notes || null,
          status: paymentState(d.amount, previous),
          paidAmount: previous,
        };
      } else {
        if (d.action !== "reopen" && d.paidAt > todayISO())
          throw new RequestError(
            "A data do pagamento não pode estar no futuro.",
          );
        const delta =
          d.action === "reopen"
            ? -previous
            : d.action === "settle"
              ? money(p.amount - previous)
              : d.amount;
        if (delta === 0)
          throw new RequestError("Não há valor para registrar nesta operação.");
        const total = money(previous + delta);
        const status = paymentState(p.amount, total);
        const paidAt =
          d.action === "reopen" ? asDate(todayISO()) : asDate(d.paidAt);
        await tx.paymentEvent.create({
          data: {
            paymentId: p.id,
            amount: money(delta),
            paidAt,
            kind: d.action === "reopen" ? "REVERSAL" : "PAYMENT",
          },
        });
        data = { paidAmount: total, paidAt: total ? paidAt : null, status };
      }
      return tx.payment.update({
        where: { id: p.id },
        data: { ...data, updatedAt },
      });
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("O valor pago"))
      return NextResponse.json({ error: error.message }, { status: 400 });
    return errorResponse(error);
  }
}
