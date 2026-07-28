-- Add account blocking and expiring password reset links.
ALTER TABLE "User" ADD COLUMN "blockedAt" TIMESTAMP(3);
ALTER TABLE "UserPasswordReset" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Existing unused links receive the same 60 minute lifetime as new links.
UPDATE "UserPasswordReset"
SET "expiresAt" = COALESCE("createdAt", CURRENT_TIMESTAMP) + INTERVAL '60 minutes'
WHERE "expiresAt" IS NULL;

-- Keep a secret-free audit trail of administrative mutations.
CREATE TABLE "AdminAuditLog" (
    "id" SERIAL NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx"
ON "AdminAuditLog"("actorUserId", "createdAt");

CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx"
ON "AdminAuditLog"("targetUserId", "createdAt");
