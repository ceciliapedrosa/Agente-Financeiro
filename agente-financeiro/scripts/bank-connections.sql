CREATE TABLE IF NOT EXISTS "BankConnection" (
 "id" TEXT PRIMARY KEY,
 "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "itemId" TEXT UNIQUE,
 "tokenHash" TEXT,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastCheckedAt" TIMESTAMP(3),
 "busyUntil" TIMESTAMP(3),
 "snapshot" JSONB
);
CREATE INDEX IF NOT EXISTS "BankConnection_userId_createdAt_idx" ON "BankConnection"("userId", "createdAt");
