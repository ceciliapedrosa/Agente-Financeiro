import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { getSessionUserId } from "./auth";
import { calendarDate } from "./recurrence";
import { cents, paidValue, paymentState, todayISO } from "./finance";
import { inScope, shiftedDate } from "./manage-rules";
const amount = z.coerce
  .number()
  .finite()
  .positive()
  .max(999999999)
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001);
const day = z.string().refine((s) => {
  try {
    calendarDate(s);
    return +s.slice(0, 4) >= 1900 && +s.slice(0, 4) <= 9998;
  } catch {
    return false;
  }
}, "Data inválida.");
const details = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  amount,
  date: day,
});
const schema = z.object({
  kind: z.enum(["PAYMENT", "RECEIPT", "CARD"]),
  action: z.enum([
    "edit",
    "cancel",
    "restore",
    "receive",
    "reverse",
    "stop",
    "archive",
    "unarchive",
    "invoice",
  ]),
  id: z.string().min(1),
  updatedAt: z.string().datetime(),
  scope: z.enum(["ONE", "FUTURE", "ALL"]).default("ONE"),
  name: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(["ESSENTIAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  notes: z.string().trim().max(2000).optional(),
  amount: z.coerce.number().optional(),
  date: z.string().optional(),
  institution: z.string().optional(),
  creditLimit: z.coerce.number().optional(),
  closingDay: z.coerce.number().optional(),
  dueDay: z.coerce.number().optional(),
  month: z.string().optional(),
  paymentId: z.string().optional(),
  seriesVersion: z.string().optional(),
});
class Failure extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const snapshot = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
async function history(
  tx: Prisma.TransactionClient,
  userId: string,
  kind: string,
  id: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  await tx.recordHistory.create({
    data: {
      userId,
      kind,
      recordId: id,
      action,
      before: snapshot(before),
      after: snapshot(after),
    },
  });
}
function version(p: { updatedAt: Date }, expected: string) {
  if (p.updatedAt.toISOString() !== expected)
    throw new Failure(
      "Registro alterado em outra sessão. Atualize a página.",
      409,
    );
}
export function seriesVersion(rows: { id: string; updatedAt: Date }[]) {
  return rows
    .map((r) => r.id + ":" + r.updatedAt.toISOString())
    .sort()
    .join("|");
}
export async function changeRecord(
  tx: Prisma.TransactionClient,
  userId: string,
  input: unknown,
) {
  const d = schema.parse(input);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
  if (d.kind === "CARD") {
    const c = await tx.card.findFirst({ where: { id: d.id, userId } });
    if (!c) throw new Failure("Cartão não encontrado.", 404);
    version(c, d.updatedAt);
    let data: Prisma.CardUpdateInput = {
      updatedAt: new Date(Math.max(Date.now(), c.updatedAt.getTime() + 1)),
    };
    if (d.action === "edit") {
      const fields = z
        .object({
          name: z.string().trim().min(1).max(200),
          institution: z.string().trim().min(1).max(200),
          creditLimit: z.coerce
            .number()
            .finite()
            .min(0)
            .max(999999999)
            .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001),
          closingDay: z.coerce.number().int().min(1).max(31),
          dueDay: z.coerce.number().int().min(1).max(31),
        })
        .parse(d);
      data = { ...data, ...fields };
    } else if (d.action === "archive") data.archivedAt = new Date();
    else if (d.action === "unarchive") data.archivedAt = null;
    else if (d.action === "invoice") {
      if (c.archivedAt)
        throw new Failure("Restaure o cartão antes de cadastrar faturas.");
      const month = z
        .string()
        .regex(/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/)
        .parse(d.month);
      if (
        await tx.cardInvoice.findUnique({
          where: { cardId_month: { cardId: c.id, month } },
        })
      )
        throw new Failure(
          "Já existe fatura nesta competência. Edite a fatura existente.",
        );
      let paymentId = d.paymentId;
      if (paymentId) {
        const p = await tx.payment.findFirst({
          where: { id: paymentId, userId },
          include: { invoice: true },
        });
        if (!p || p.cancelledAt || p.invoice || p.seriesId)
          throw new Failure(
            "Selecione uma despesa ativa, avulsa e ainda não vinculada.",
          );
      } else {
        const value = amount.parse(d.amount),
          dueDate = calendarDate(day.parse(d.date));
        const p = await tx.payment.create({
          data: {
            userId,
            name: `Fatura ${c.name} · ${month}`,
            category: "Cartão de crédito",
            amount: value,
            dueDate,
          },
        });
        paymentId = p.id;
      }
      const invoice = await tx.cardInvoice.create({
        data: { cardId: c.id, month, paymentId },
      });
      data.invoiceReviewedAt = new Date();
      await history(
        tx,
        userId,
        "CARD",
        c.id,
        "invoice",
        { currentInvoice: c.currentInvoice },
        invoice,
      );
    } else throw new Failure("Operação inválida.");
    const updated = await tx.card.update({ where: { id: c.id }, data });
    if (d.action !== "invoice")
      await history(tx, userId, "CARD", c.id, d.action, c, updated);
    return { changed: 1, skipped: 0 };
  }
  const isPayment = d.kind === "PAYMENT";
  const anchor = isPayment
    ? await tx.payment.findFirst({ where: { id: d.id, userId } })
    : await tx.receipt.findFirst({ where: { id: d.id, userId } });
  if (!anchor) throw new Failure("Registro não encontrado.", 404);
  version(anchor, d.updatedAt);
  if (d.scope !== "ONE" && !anchor.seriesId)
    throw new Failure(
      "Este lançamento antigo não possui uma sequência identificada. Altere somente esta ocorrência.",
    );
  if (d.action === "stop" && d.scope !== "FUTURE")
    throw new Failure("Use esta e as próximas para encerrar a sequência.");
  if (
    !["edit", "cancel", "restore", "receive", "reverse", "stop"].includes(
      d.action,
    )
  )
    throw new Failure("Operação inválida.");
  if (isPayment && ["receive", "reverse"].includes(d.action))
    throw new Failure("Use as ações de pagamento da conta.");
  if (["receive", "reverse", "restore"].includes(d.action) && d.scope !== "ONE")
    throw new Failure("Esta ação é individual.");
  const where = {
    userId,
    ...(d.scope === "ONE" ? { id: anchor.id } : { seriesId: anchor.seriesId }),
  };
  const rows = isPayment
    ? await tx.payment.findMany({ where, orderBy: { id: "asc" } })
    : await tx.receipt.findMany({ where, orderBy: { id: "asc" } });
  if (d.scope !== "ONE" && seriesVersion(rows) !== d.seriesVersion)
    throw new Failure(
      "A sequência foi alterada. Feche e abra novamente para conferir as ocorrências.",
      409,
    );
  const edit = d.action === "edit" ? details.parse(d) : null;
  if (isPayment && edit && d.month) {
    const month = z
      .string()
      .regex(/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/)
      .parse(d.month);
    const invoice = await tx.cardInvoice.findUnique({
      where: { paymentId: anchor.id },
    });
    if (!invoice || d.scope !== "ONE")
      throw new Failure(
        "A competência só pode ser alterada em uma fatura individual.",
      );
    const duplicate = await tx.cardInvoice.findUnique({
      where: { cardId_month: { cardId: invoice.cardId, month } },
    });
    if (duplicate && duplicate.id !== invoice.id)
      throw new Failure("Já existe uma fatura nessa competência.");
    if (month !== invoice.month) {
      await tx.cardInvoice.update({
        where: { id: invoice.id },
        data: { month },
      });
      await history(
        tx,
        userId,
        "PAYMENT",
        anchor.id,
        "invoiceperiod",
        { month: invoice.month },
        { month },
      );
    }
  }

  let changed = 0,
    skipped = 0;
  for (const row of rows) {
    if (!inScope(row, anchor, d.scope)) continue;
    const paid =
      "paidAmount" in row ? paidValue(row) : row.receivedAt ? row.amount : 0;
    if (d.scope !== "ONE" && (paid > 0 || row.cancelledAt)) {
      skipped++;
      continue;
    }
    if (row.cancelledAt && d.action !== "restore")
      throw new Failure("Restaure o registro antes de alterá-lo.");
    if (d.action === "restore" && !row.cancelledAt)
      throw new Failure("Este registro já está ativo.");
    let patch: Record<string, unknown> = {
      updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)),
    };
    if (edit) {
      patch = {
        ...patch,
        name: edit.name,
        category: edit.category,
        amount: edit.amount,
      };
      const oldDate = "dueDate" in row ? row.dueDate : row.expectedAt,
        anchorDate = "dueDate" in anchor ? anchor.dueDate : anchor.expectedAt;
      try {
        patch[isPayment ? "dueDate" : "expectedAt"] =
          d.scope === "ONE"
            ? calendarDate(edit.date)
            : shiftedDate(oldDate, anchorDate, edit.date);
      } catch {
        throw new Failure("O período ultrapassa o limite de datas.");
      }
      if (isPayment) {
        if (cents(edit.amount) < cents(paid))
          throw new Failure(
            "O valor não pode ser menor que o já pago. Estorne o pagamento antes.",
          );
        if (d.priority !== undefined) patch.priority = d.priority;
        if (d.notes !== undefined) patch.notes = d.notes || null;
        patch.status = paymentState(edit.amount, paid);
        patch.paidAmount = paid;
      }
    } else if (d.action === "receive") {
      const date = day.parse(d.date);
      if (date > todayISO())
        throw new Failure("Informe uma data efetiva até hoje.");
      patch.receivedAt = calendarDate(date);
    } else if (d.action === "reverse") {
      if (!("receivedAt" in row) || !row.receivedAt)
        throw new Failure("Não há recebimento para desfazer.");
      patch.receivedAt = null;
    } else if (d.action === "cancel" || d.action === "stop")
      patch.cancelledAt = new Date();
    else if (d.action === "restore") patch.cancelledAt = null;
    const after = isPayment
      ? await tx.payment.update({
          where: { id: row.id },
          data: patch as Prisma.PaymentUpdateInput,
        })
      : await tx.receipt.update({
          where: { id: row.id },
          data: patch as Prisma.ReceiptUpdateInput,
        });
    await history(tx, userId, d.kind, row.id, d.action, row, after);
    changed++;
  }
  return { changed, skipped };
}
export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    return NextResponse.json(
      await db.$transaction((tx) => changeRecord(tx, userId, body), {
        timeout: 20000,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Failure
            ? error.message
            : error instanceof z.ZodError
              ? "Confira os campos e as datas."
              : "Não foi possível salvar. Tente novamente.",
      },
      {
        status:
          error instanceof Failure
            ? error.status
            : error instanceof z.ZodError || error instanceof SyntaxError
              ? 400
              : 500,
      },
    );
  }
}
export async function GET(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const q = new URL(req.url).searchParams,
    id = q.get("id") ?? "",
    kind = q.get("kind");
  const row =
    kind === "PAYMENT"
      ? await db.payment.findFirst({ where: { id, userId } })
      : kind === "RECEIPT"
        ? await db.receipt.findFirst({ where: { id, userId } })
        : kind === "CARD"
          ? await db.card.findFirst({ where: { id, userId } })
          : null;
  if (!row)
    return NextResponse.json(
      { error: "Registro não encontrado." },
      { status: 404 },
    );
  const historyRows = await db.recordHistory.findMany({
    where: { userId, recordId: id, kind: kind! },
    orderBy: { createdAt: "desc" },
  });
  const occurrences =
    "seriesId" in row && row.seriesId
      ? kind === "PAYMENT"
        ? await db.payment.findMany({
            where: { userId, seriesId: row.seriesId },
            orderBy: { seriesIndex: "asc" },
          })
        : await db.receipt.findMany({
            where: { userId, seriesId: row.seriesId },
            orderBy: { seriesIndex: "asc" },
          })
      : [];
  return NextResponse.json({
    history: historyRows,
    occurrences,
    seriesVersion: seriesVersion(occurrences),
  });
}
