import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  tx: {} as Record<string, unknown>,
}));
vi.mock("@/lib/auth", () => ({ getSessionUserId: mocks.session }));
vi.mock("@/lib/db", () => ({
  db: { $transaction: async (fn: (tx: unknown) => unknown) => fn(mocks.tx) },
}));
import { changeRecord, PATCH, seriesVersion } from "../src/lib/manage-records";
import { overdueDays, shiftedDate } from "../src/lib/manage-rules";
const date = new Date("2026-10-01T12:00:00Z");
const receipt = {
  id: "r1",
  userId: "owner",
  name: "Salário",
  category: "Salário",
  amount: 100,
  expectedAt: date,
  receivedAt: null,
  updatedAt: date,
  seriesId: null,
  seriesIndex: 0,
  cancelledAt: null,
};
const payment = {
  ...receipt,
  id: "p1",
  dueDate: date,
  status: "PARTIAL",
  paidAmount: 30,
  paidAt: date,
};
const card = {
  id: "c1",
  userId: "owner",
  name: "Cartão",
  creditLimit: 1000,
  currentInvoice: 100,
  closingDay: 5,
  dueDay: 10,
  updatedAt: date,
  archivedAt: null,
};
let tx: ReturnType<typeof setup>;
function setup() {
  return {
    $executeRaw: vi.fn(),
    receipt: {
      findFirst: vi.fn().mockResolvedValue(receipt),
      findMany: vi.fn().mockResolvedValue([receipt]),
      update: vi
        .fn()
        .mockImplementation(async ({ data }) => ({ ...receipt, ...data })),
    },
    payment: {
      findFirst: vi.fn().mockResolvedValue(payment),
      findMany: vi.fn().mockResolvedValue([payment]),
      update: vi
        .fn()
        .mockImplementation(async ({ data }) => ({ ...payment, ...data })),
      create: vi.fn().mockResolvedValue({ id: "new-debt" }),
    },
    card: {
      findFirst: vi.fn().mockResolvedValue(card),
      update: vi
        .fn()
        .mockImplementation(async ({ data }) => ({ ...card, ...data })),
    },
    cardInvoice: {
      update: vi.fn(),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockImplementation(async ({ data }) => ({ id: "invoice", ...data })),
    },
    recordHistory: { create: vi.fn() },
  };
}
const change = (input: unknown) =>
  changeRecord(tx as unknown as Prisma.TransactionClient, "owner", input);
const identity = { kind: "RECEIPT", id: "r1", updatedAt: date.toISOString() };
beforeEach(() => {
  tx = setup();
  mocks.tx = tx;
  mocks.session.mockResolvedValue("owner");
});
describe("editing and recoverable lifecycle", () => {
  it("creates an already-paid invoice with an actual dated payment event", async () => {
    await change({kind:"CARD",id:"c1",updatedAt:date.toISOString(),action:"invoice",month:"2026-10",amount:370,date:"2026-10-20",invoiceStatus:"PAID",paidAt:"2026-10-18"});
    expect(tx.payment.create.mock.calls[0][0].data).toMatchObject({status:"PAID",paidAmount:370,events:{create:{amount:370,kind:"PAYMENT"}}});
    expect(tx.cardInvoice.create).toHaveBeenCalledTimes(1);
  });
  it("rejects an invoice payment in the future before creating a debt", async () => {
    await expect(change({kind:"CARD",id:"c1",updatedAt:date.toISOString(),action:"invoice",month:"2026-10",amount:370,date:"2026-10-20",invoiceStatus:"PAID",paidAt:"9998-10-18"})).rejects.toThrow("futuro");
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
  it("edits priority and notes through the audited manager without losing partial payments", async () => {
    await change({ kind: "PAYMENT", id: "p1", updatedAt: date.toISOString(), action: "edit", name: "Internet", category: "Casa", amount: 100, date: "2026-10-01", priority: "HIGH", notes: " Conferir boleto " });
    expect(tx.payment.update.mock.calls[0][0].data).toMatchObject({ priority: "HIGH", notes: "Conferir boleto", paidAmount: 30, status: "PARTIAL" });
    expect(tx.recordHistory.create).toHaveBeenCalled();
  });
  it("checks authentication before writes", async () => {
    mocks.session.mockResolvedValue(null);
    expect(
      (
        await PATCH(
          new Request("http://localhost", { method: "PATCH", body: "{}" }),
        )
      ).status,
    ).toBe(401);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
  it("checks ownership and stale versions before mutation", async () => {
    tx.receipt.findFirst.mockResolvedValueOnce(null);
    await expect(change({ ...identity, action: "cancel" })).rejects.toThrow(
      "não encontrado",
    );
    expect(tx.receipt.findFirst).toHaveBeenCalledWith({
      where: { id: "r1", userId: "owner" },
    });
    await expect(
      change({
        ...identity,
        action: "cancel",
        updatedAt: new Date(0).toISOString(),
      }),
    ).rejects.toThrow("outra sessão");
    expect(tx.receipt.update).not.toHaveBeenCalled();
  });
  it("edits received value while preserving actual date and audit snapshots", async () => {
    const r = { ...receipt, receivedAt: date };
    tx.receipt.findFirst.mockResolvedValue(r);
    tx.receipt.findMany.mockResolvedValue([r]);
    await change({
      ...identity,
      action: "edit",
      name: "Correção",
      category: "Outros",
      amount: 120,
      date: "2026-10-02",
    });
    const data = tx.receipt.update.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "Correção",
      amount: 120,
      expectedAt: new Date("2026-10-02T12:00:00Z"),
    });
    expect(data).not.toHaveProperty("receivedAt");
    expect(tx.recordHistory.create.mock.calls[0][0].data.before).toMatchObject({
      amount: 100,
      receivedAt: date.toISOString(),
    });
  });
  it("reverses receipt and keeps expected date in history", async () => {
    const r = { ...receipt, receivedAt: date };
    tx.receipt.findMany.mockResolvedValue([r]);
    await change({ ...identity, action: "reverse" });
    expect(tx.receipt.update.mock.calls[0][0].data.receivedAt).toBeNull();
    expect(tx.recordHistory.create.mock.calls[0][0].data.action).toBe(
      "reverse",
    );
  });
  it("validates real dates and future receipts", async () => {
    for (const d of ["2026-02-30", "2099-01-01"])
      await expect(
        change({ ...identity, action: "receive", date: d }),
      ).rejects.toThrow();
    expect(tx.receipt.update).not.toHaveBeenCalled();
  });
  it("cancels without erasing paid data and restores the previous values", async () => {
    await change({ ...identity, kind: "PAYMENT", id: "p1", action: "cancel" });
    expect(tx.payment.update.mock.calls[0][0].data).not.toHaveProperty(
      "paidAmount",
    );
    const cancelled = { ...receipt, cancelledAt: date, receivedAt: date };
    tx.receipt.findFirst.mockResolvedValue(cancelled);
    tx.receipt.findMany.mockResolvedValue([cancelled]);
    await change({ ...identity, action: "restore" });
    expect(tx.receipt.update.mock.calls[0][0].data).toMatchObject({
      cancelledAt: null,
    });
    expect(tx.receipt.update.mock.calls[0][0].data).not.toHaveProperty(
      "receivedAt",
    );
  });
  it("blocks ordinary edits on cancelled records and reductions below paid total", async () => {
    tx.receipt.findMany.mockResolvedValue([{ ...receipt, cancelledAt: date }]);
    await expect(
      change({ ...identity, action: "receive", date: "2026-10-01" }),
    ).rejects.toThrow("Restaure");
    await expect(
      change({
        ...identity,
        kind: "PAYMENT",
        id: "p1",
        action: "edit",
        name: "P",
        category: "C",
        amount: 20,
        date: "2026-10-01",
      }),
    ).rejects.toThrow("já pago");
    expect(tx.payment.update).not.toHaveBeenCalled();
  });
});
describe("series scopes and protection", () => {
  const rows = [
    { ...receipt, id: "r0", seriesId: "s", seriesIndex: 0, receivedAt: date },
    {
      ...receipt,
      id: "r1",
      seriesId: "s",
      seriesIndex: 1,
      expectedAt: new Date("2026-11-01T12:00:00Z"),
    },
    {
      ...receipt,
      id: "r2",
      seriesId: "s",
      seriesIndex: 2,
      expectedAt: new Date("2026-12-01T12:00:00Z"),
    },
  ];
  function series() {
    tx.receipt.findFirst.mockResolvedValue(rows[1]);
    tx.receipt.findMany.mockResolvedValue(rows);
  }
  it("edits the whole series but preserves received occurrences", async () => {
    series();
    expect(
      await change({
        ...identity,
        action: "edit",
        scope: "ALL",
        seriesVersion: seriesVersion(rows),
        name: "Novo",
        category: "Salário",
        amount: 200,
        date: "2026-11-30",
      }),
    ).toEqual({ changed: 2, skipped: 1 });
    expect(
      tx.receipt.update.mock.calls.map(([a]) =>
        a.data.expectedAt.toISOString().slice(0, 10),
      ),
    ).toEqual(["2026-11-30", "2026-12-30"]);
  });
  it("ends from selected occurrence forward, retaining completed history", async () => {
    series();
    expect(
      await change({
        ...identity,
        action: "stop",
        scope: "FUTURE",
        seriesVersion: seriesVersion(rows),
      }),
    ).toEqual({ changed: 2, skipped: 0 });
    expect(tx.receipt.update.mock.calls.map(([a]) => a.where.id)).toEqual([
      "r1",
      "r2",
    ]);
  });
  it("rejects modified series previews and ungrouped legacy rows", async () => {
    series();
    await expect(
      change({
        ...identity,
        action: "stop",
        scope: "FUTURE",
        seriesVersion: "stale",
      }),
    ).rejects.toThrow("sequência foi alterada");
    tx.receipt.findFirst.mockResolvedValue(receipt);
    await expect(
      change({ ...identity, action: "edit", scope: "ALL" }),
    ).rejects.toThrow("antigo");
    expect(tx.receipt.update).not.toHaveBeenCalled();
  });
});
describe("card invoices", () => {
  const id = {
    kind: "CARD",
    id: "c1",
    updatedAt: date.toISOString(),
    action: "invoice",
    month: "2026-10",
  };
  it("links an existing expense without creating or changing money", async () => {
    await change({ ...id, paymentId: "p1" });
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.cardInvoice.create).toHaveBeenCalledWith({
      data: { cardId: "c1", month: "2026-10", paymentId: "p1" },
    });
  });
  it("creates one payable invoice with actual due date", async () => {
    await change({ ...id, amount: 670, date: "2026-11-13" });
    expect(tx.payment.create.mock.calls[0][0].data).toMatchObject({
      userId: "owner",
      amount: 670,
      dueDate: new Date("2026-11-13T12:00:00Z"),
    });
    expect(tx.cardInvoice.create.mock.calls[0][0].data.paymentId).toBe(
      "new-debt",
    );
  });
  it("blocks duplicate periods and foreign or linked expenses", async () => {
    tx.cardInvoice.findUnique.mockResolvedValueOnce({ id: "already" });
    await expect(
      change({ ...id, amount: 100, date: "2026-10-10" }),
    ).rejects.toThrow("Já existe");
    for (const p of [
      null,
      { ...payment, invoice: { id: "linked" } },
      { ...payment, cancelledAt: date },
    ]) {
      tx.payment.findFirst.mockResolvedValueOnce(p);
      await expect(change({ ...id, paymentId: "p1" })).rejects.toThrow(
        "Selecione",
      );
    }
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
  it("corrects invoice competence without duplicating the expense", async () => {
    tx.cardInvoice.findUnique.mockResolvedValueOnce({
      id: "i1",
      cardId: "c1",
      paymentId: "p1",
      month: "2026-10",
    });
    await change({
      ...identity,
      kind: "PAYMENT",
      id: "p1",
      action: "edit",
      name: "Fatura",
      category: "Cartão",
      amount: 100,
      date: "2026-11-10",
      month: "2026-11",
    });
    expect(tx.cardInvoice.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { month: "2026-11" },
    });
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
  it("archives without removing invoices or payment history", async () => {
    await change({ ...id, action: "archive" });
    expect(tx.card.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(
      Date,
    );
    expect(tx.payment.update).not.toHaveBeenCalled();
    expect(tx.cardInvoice.create).not.toHaveBeenCalled();
  });
});
it("computes calendar overdue days and month-end shifts", () => {
  expect(overdueDays("2026-10-10", "2026-10-21")).toBe(11);
  expect(overdueDays("2026-10-21", "2026-10-21")).toBe(0);
  expect(overdueDays("2026-10-22", "2026-10-21")).toBe(0);
  expect(
    shiftedDate(new Date("2027-02-01"), new Date("2027-01-01"), "2027-01-31")
      .toISOString()
      .slice(0, 10),
  ).toBe("2027-02-28");
});
