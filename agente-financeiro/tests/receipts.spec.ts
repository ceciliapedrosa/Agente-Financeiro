import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getSessionUserId: mocks.session }));
vi.mock("@/lib/db", () => ({
  db: {
    receipt: {
      create: mocks.create,
      findFirst: mocks.find,
      updateMany: mocks.update,
    },
    $transaction: async (fn: Function) =>
      fn({
        receipt: {
          create: mocks.create,
          findFirst: mocks.find,
          updateMany: mocks.update,
        },
      }),
  },
}));
import { POST, PATCH } from "../src/app/api/receipts/route";
const request = (body: unknown) =>
  new Request("http://localhost/api/receipts", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue("owner");
  mocks.create.mockImplementation(async ({ data }) => data);
});
describe("recurring receipts", () => {
  it("leaves future receipts pending even when the first is received", async () => {
    const r = await POST(
      request({
        name: "Salário",
        category: "Salário",
        amount: 1600,
        expectedAt: "2026-01-31",
        recurrence: "MONTHLY",
        occurrences: 3,
        status: "RECEIVED",
        receivedAt: "2026-02-03",
      }),
    );
    expect(r.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledTimes(3);
    const rows = mocks.create.mock.calls.map(([a]) => a.data);
    expect(rows[0].receivedAt.toISOString().slice(0, 10)).toBe("2026-02-03");
    expect(rows[0].expectedAt.toISOString().slice(0, 10)).toBe("2026-01-31");
    expect(rows[1].receivedAt).toBeNull();
    expect(rows[2].receivedAt).toBeNull();
    expect(rows[1].expectedAt.toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(rows.every((r) => r.userId === "owner")).toBe(true);
  });
  it("requires authentication", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await POST(request({}))).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects invalid dates before writing", async () => {
    expect(
      (
        await POST(
          request({
            name: "Entrada",
            category: "Outros",
            amount: 1,
            expectedAt: "2026-02-30",
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});

describe("effective receipt dates", () => {
  it("requires actual date for received income", async () => {
    const r = await POST(
      request({
        name: "Salário",
        category: "Salário",
        amount: 1600,
        expectedAt: "2026-01-31",
        status: "RECEIVED",
      }),
    );
    expect(r.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects future effective dates", async () => {
    const r = await PATCH(
      request({ id: "r1", receivedAt: "2099-01-01", expectedReceivedAt: null }),
    );
    expect(r.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("rejects impossible effective dates", async () => {
    const r = await PATCH(
      request({ id: "r1", receivedAt: "2026-02-30", expectedReceivedAt: null }),
    );
    expect(r.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("checks ownership before mutation", async () => {
    mocks.find.mockResolvedValue(null);
    const r = await PATCH(
      request({ id: "r1", receivedAt: "2026-09-01", expectedReceivedAt: null }),
    );
    expect(r.status).toBe(404);
    expect(mocks.find).toHaveBeenCalledWith({
      where: { id: "r1", userId: "owner" },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("updates only effective date with an atomic prior-value guard", async () => {
    mocks.find.mockResolvedValue({ id: "r1" });
    mocks.update.mockResolvedValue({ count: 1 });
    const r = await PATCH(
      request({ id: "r1", receivedAt: "2026-09-01", expectedReceivedAt: null }),
    );
    expect(r.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "r1", userId: "owner", receivedAt: null },
      data: { receivedAt: new Date("2026-09-01T12:00:00Z") },
    });
  });
  it("rejects concurrent changes", async () => {
    mocks.find.mockResolvedValue({ id: "r1" });
    mocks.update.mockResolvedValue({ count: 0 });
    const r = await PATCH(
      request({ id: "r1", receivedAt: "2026-09-01", expectedReceivedAt: null }),
    );
    expect(r.status).toBe(409);
  });
});
