import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { todayISO } from "@/lib/finance";
import { occurrenceDates, calendarDate } from "@/lib/recurrence";
const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  amount: z.coerce
    .number()
    .finite()
    .positive()
    .max(999999999)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001),
  expectedAt: z.string(),
  receivedAt: z.string().optional(),
  recurrence: z.enum(["NONE", "MONTHLY", "YEARLY"]).default("NONE"),
  occurrences: z.coerce.number().int().min(2).max(60).optional(),
  recurrenceEnd: z.string().optional(),
  status: z.enum(["PENDING", "RECEIVED"]).default("PENDING"),
});
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const d = createSchema.parse(await req.json());
    let dates: string[];
    try {
      dates = occurrenceDates(
        d.expectedAt,
        d.recurrence,
        d.occurrences ?? 12,
        d.recurrenceEnd || undefined,
      );
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
    let receivedAt: Date | null = null;
    if (d.status === "RECEIVED") {
      try {
        receivedAt = calendarDate(d.receivedAt ?? "");
        if ((d.receivedAt ?? "") > todayISO()) throw new Error();
      } catch {
        return NextResponse.json(
          {
            error: "Informe uma data efetiva de recebimento válida, até hoje.",
          },
          { status: 400 },
        );
      }
    }
    const data = {
      userId,
      name: d.name,
      category: d.category,
      amount: Math.round(d.amount * 100) / 100,
      expectedAt: calendarDate(d.expectedAt),
      receivedAt: receivedAt,
      recurring: d.recurrence !== "NONE",
    };
    const receipt =
      dates.length === 1
        ? await db.receipt.create({ data })
        : await db.$transaction(
            async (tx) => {
              let first;
              for (let i = 0; i < dates.length; i++) {
                const item = await tx.receipt.create({
                  data: {
                    ...data,
                    expectedAt: calendarDate(dates[i]),
                    receivedAt: i ? null : data.receivedAt,
                  },
                });
                if (!i) first = item;
              }
              return first!;
            },
            { timeout: 15000 },
          );
    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Confira os dados da receita." },
        { status: 400 },
      );
    return NextResponse.json(
      { error: "Não foi possível salvar a receita. Tente novamente." },
      { status: 500 },
    );
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  receivedAt: z.string(),
  expectedReceivedAt: z.string().datetime().nullable(),
});
export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const d = updateSchema.parse(await req.json());
    let receivedAt: Date;
    try {
      receivedAt = calendarDate(d.receivedAt);
      if (d.receivedAt > todayISO()) throw new Error();
    } catch {
      return NextResponse.json(
        { error: "Informe uma data efetiva de recebimento válida, até hoje." },
        { status: 400 },
      );
    }
    const existing = await db.receipt.findFirst({
      where: { id: d.id, userId },
    });
    if (!existing)
      return NextResponse.json(
        { error: "Receita não encontrada." },
        { status: 404 },
      );
    const changed = await db.receipt.updateMany({
      where: {
        id: d.id,
        userId,
        receivedAt: d.expectedReceivedAt
          ? new Date(d.expectedReceivedAt)
          : null,
      },
      data: { receivedAt },
    });
    if (!changed.count)
      return NextResponse.json(
        {
          error:
            "Este recebimento foi alterado em outra sessão. Atualize a página.",
        },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? "Confira os dados do recebimento."
            : "Não foi possível salvar o recebimento.",
      },
      {
        status:
          error instanceof z.ZodError || error instanceof SyntaxError
            ? 400
            : 500,
      },
    );
  }
}
