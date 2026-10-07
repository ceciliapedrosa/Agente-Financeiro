import { describe, it, expect } from "vitest";
import {
  parseBRMoney,
  formatBRMoney,
  parseBRDate,
  formatBRDate,
} from "../src/lib/input-format";
import { filterFinancialRows } from "../src/lib/financial-search";
describe("Brazilian financial input", () => {
  it("parses grouping and decimal separators without multiplying cents", () => {
    expect(parseBRMoney("R$ 1.600,00")).toBe(1600);
    expect(parseBRMoney("89,61")).toBe(89.61);
    expect(parseBRMoney("0,01")).toBe(0.01);
    expect(parseBRMoney("1600")).toBe(1600);
  });
  it("rejects ambiguous, negative or overprecise values", () => {
    for (const value of ["1.60", "-10,00", "1,234", "1e3", "", "1.23.456,00"])
      expect(parseBRMoney(value)).toBeNull();
  });
  it("roundtrips formatted amounts", () => {
    for (const n of [0, 0.01, 89.61, 1600, 1234567.89])
      expect(parseBRMoney(formatBRMoney(n))).toBe(n);
  });
  it("converts real Brazilian dates, including leap years", () => {
    expect(parseBRDate("29/02/2024")).toBe("2024-02-29");
    expect(parseBRDate("29/02/2025")).toBe("");
    expect(parseBRDate("31/04/2026")).toBe("");
    expect(parseBRDate("2026-10-07")).toBe("");
    expect(formatBRDate("2026-10-07")).toBe("07/10/2026");
  });
});
describe("financial search and sorting", () => {
  const rows = [
    {
      name: "PLANO SAÚDE",
      category: "Saúde",
      amount: 198.41,
      date: new Date("2026-10-20"),
    },
    {
      name: "Internet",
      category: "Casa",
      amount: 79,
      date: new Date("2026-10-10"),
    },
    {
      name: "Saúde familiar",
      category: "Saúde",
      amount: 400,
      date: new Date("2026-10-05"),
    },
  ];
  it("matches names without case or accent sensitivity", () =>
    expect(
      filterFinancialRows(rows, " saude ", "", "date_asc", (r) => r.date).map(
        (r) => r.amount,
      ),
    ).toEqual([400, 198.41]));
  it("combines category with search and sorts numerically", () =>
    expect(
      filterFinancialRows(rows, "", "Saúde", "amount_asc", (r) => r.date).map(
        (r) => r.amount,
      ),
    ).toEqual([198.41, 400]));
  it("supports reverse dates and empty results without mutating the source", () => {
    expect(
      filterFinancialRows(rows, "", "", "date_desc", (r) => r.date)[0].name,
    ).toBe("PLANO SAÚDE");
    expect(
      filterFinancialRows(rows, "inexistente", "", "date_asc", (r) => r.date),
    ).toEqual([]);
    expect(rows[0].name).toBe("PLANO SAÚDE");
  });
});
