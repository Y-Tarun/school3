ALTER TABLE "refresh_tokens" ADD COLUMN "sessionId" UUID;

UPDATE "refresh_tokens" SET "sessionId" = "id" WHERE "sessionId" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "sessionId" SET NOT NULL;

CREATE INDEX "refresh_tokens_adminId_sessionId_revokedAt_idx"
    ON "refresh_tokens"("adminId", "sessionId", "revokedAt");
