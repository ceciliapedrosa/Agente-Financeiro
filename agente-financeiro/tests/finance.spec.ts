import { test } from "vitest";
import assert from "node:assert/strict";
import {
  totals,
  monthPeriod,
  paidValue,
  remaining,
  paymentState,
  todayISO,
} from "../src/lib/finance";
test("monthly projection deducts full expenses once, including already paid portions", () => {
  const result = totals(
    [
      { amount: 100, paidAmount: 40, status: "PARTIAL" },
      { amount: 50, paidAmount: 50, status: "PAID" },
    ],
    [{ amount: 200 }],
  );
  assert.deepEqual(result, {
    expenses: 150,
    paid: 90,
    income: 200,
    pending: 60,
    projected: 50,
  });
});
test("legacy paid accounts and partial remaining balance", () => {
  assert.equal(
    paidValue({ amount: 100, paidAmount: null, status: "PAID" }),
    100,
  );
  assert.equal(
    remaining({ amount: 100, paidAmount: 35, status: "PARTIAL" }),
    65,
  );
});
test("cent precision and settlement validation", () => {
  assert.equal(
    totals([{ amount: 0.3, paidAmount: 0.1, status: "PARTIAL" }], []).pending,
    0.2,
  );
  assert.equal(paymentState(100, 40), "PARTIAL");
  assert.equal(paymentState(100, 100), "PAID");
  assert.equal(paymentState(100, 0), "PENDING");
  assert.throws(() => paymentState(100, 101));
  assert.throws(() => paymentState(100, -1));
});
test("December period ends in next year and invalid months fall back safely", () => {
  const p = monthPeriod("2026-12");
  assert.equal(p.start.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(p.end.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.notEqual(monthPeriod("2026-13").key, "2026-13");
});
test("Brazil calendar date differs from UTC near midnight", () => {
  assert.equal(todayISO(new Date("2026-10-01T01:00:00Z")), "2026-09-30");
});
