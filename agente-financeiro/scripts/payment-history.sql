CREATE TABLE IF NOT EXISTS "PaymentEvent" (
  "id" TEXT PRIMARY KEY,
  "paymentId" TEXT NOT NULL REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "amount" DOUBLE PRECISION NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PaymentEvent_paymentId_createdAt_idx" ON "PaymentEvent"("paymentId", "createdAt");
