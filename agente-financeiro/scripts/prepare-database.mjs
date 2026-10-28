// Additive and idempotent: never resets or replaces existing tables or records.
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
const db = new PrismaClient();
try {
  const sql =
    (await readFile(
      new URL("./payment-history.sql", import.meta.url),
      "utf8",
    )) +
    "\n" +
    (await readFile(
      new URL("./record-management.sql", import.meta.url),
      "utf8",
    )) + "\n" + (await readFile(new URL("./bank-connections.sql", import.meta.url), "utf8")) + "\n" + (await readFile(new URL("./notifications.sql", import.meta.url), "utf8"));
  await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73912051)`;
      for (const statement of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.$executeRawUnsafe(statement);
    },
    { timeout: 30000 },
  );
} finally {
  await db.$disconnect();
}
