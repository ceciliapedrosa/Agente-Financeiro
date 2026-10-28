CREATE TABLE IF NOT EXISTS "NotificationPreference" (
 "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
 "upcoming" BOOLEAN NOT NULL DEFAULT true, "dueToday" BOOLEAN NOT NULL DEFAULT true,
 "overdue" BOOLEAN NOT NULL DEFAULT true, "receipts" BOOLEAN NOT NULL DEFAULT false,
 "emailEnabled" BOOLEAN NOT NULL DEFAULT false, "emailVerified" TEXT,
 "emailTokenHash" TEXT, "emailTokenExpires" TIMESTAMP(3), "emailRequestedAt" TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS "PushSubscription" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "endpoint" TEXT NOT NULL UNIQUE, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE TABLE IF NOT EXISTS "NotificationDelivery" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'CLAIMED',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");
