import { expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
it("upgrades existing records without changing amounts; invoice links are unique and reversible records survive", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `CREATE TABLE "Payment" (id TEXT PRIMARY KEY, amount FLOAT); CREATE TABLE "Receipt" (id TEXT PRIMARY KEY, amount FLOAT); CREATE TABLE "Card" (id TEXT PRIMARY KEY,"currentInvoice" FLOAT); INSERT INTO "Payment" VALUES ('old-payment',670); INSERT INTO "Receipt" VALUES ('old-receipt',1900); INSERT INTO "Card" VALUES ('old-card',670);`,
    );
    const sql = await readFile("scripts/record-management.sql", "utf8");
    await db.exec(sql);
    await db.exec(sql);
    expect(
      (await db.query('SELECT amount,"cancelledAt","seriesId" FROM "Receipt"'))
        .rows,
    ).toEqual([{ amount: 1900, cancelledAt: null, seriesId: null }]);
    expect(
      (
        await db.query(
          'SELECT "currentInvoice","invoiceReviewedAt" FROM "Card"',
        )
      ).rows,
    ).toEqual([{ currentInvoice: 670, invoiceReviewedAt: null }]);
    await db.exec(
      `INSERT INTO "CardInvoice" VALUES ('i','old-card','2026-10','old-payment')`,
    );
    expect(
      (await db.query('SELECT SUM(amount) as total FROM "Payment"')).rows,
    ).toEqual([{ total: 670 }]);
    await expect(
      db.exec(
        `INSERT INTO "CardInvoice" VALUES ('bad','old-card','2026-11','old-payment')`,
      ),
    ).rejects.toThrow();
    await db.exec(`INSERT INTO "Payment" VALUES ('p2',100,NULL,NULL,NULL)`);
    await expect(
      db.exec(
        `INSERT INTO "CardInvoice" VALUES ('bad','old-card','2026-10','p2')`,
      ),
    ).rejects.toThrow();
    await db.exec(
      `UPDATE "Payment" SET "cancelledAt"=NOW() WHERE id='old-payment'`,
    );
    expect(
      (
        await db.query(
          'SELECT SUM(amount) as total FROM "Payment" WHERE "cancelledAt" IS NULL',
        )
      ).rows,
    ).toEqual([{ total: 100 }]);
    await db.exec(
      `UPDATE "Payment" SET "cancelledAt"=NULL WHERE id='old-payment'`,
    );
    expect(
      (
        await db.query(
          'SELECT SUM(amount) as total FROM "Payment" WHERE "cancelledAt" IS NULL',
        )
      ).rows,
    ).toEqual([{ total: 770 }]);
  } finally {
    await db.close();
  }
});
