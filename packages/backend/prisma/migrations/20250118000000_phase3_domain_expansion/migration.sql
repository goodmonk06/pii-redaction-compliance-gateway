-- Phase 3 Domain Expansion Migration
-- Adds multi-tenancy, audit logging, webhooks, templates, batch processing, and analytics

-- Create new tables for multi-tenancy
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profileId" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "rateLimit" INTEGER NOT NULL DEFAULT 1000,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- Modify existing redaction_profiles table
ALTER TABLE "redaction_profiles" DROP CONSTRAINT IF EXISTS "redaction_profiles_name_key";
ALTER TABLE "redaction_profiles" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "redaction_profiles" ADD COLUMN "createdById" TEXT;
ALTER TABLE "redaction_profiles" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Create default organization for existing profiles
INSERT INTO "organizations" ("id", "name", "plan", "settings", "createdAt", "updatedAt")
VALUES ('default-org', 'Default Organization', 'enterprise', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Assign existing profiles to default organization
UPDATE "redaction_profiles" SET "organizationId" = 'default-org' WHERE "organizationId" IS NULL;

-- Make organizationId not null after backfill
ALTER TABLE "redaction_profiles" ALTER COLUMN "organizationId" SET NOT NULL;

-- Add new tables
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "secret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSuccess" TIMESTAMP(3),
    "lastFailure" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "redaction_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "rulesJson" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redaction_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "batch_redaction_jobs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inputUrl" TEXT,
    "outputUrl" TEXT,
    "statsJson" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_redaction_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "detection_history" (
    "id" TEXT NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "piiType" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detection_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Modify detection_rules to add priority
ALTER TABLE "detection_rules" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

-- Modify redaction_runs to add tracking fields
ALTER TABLE "redaction_runs" ADD COLUMN "apiKeyId" TEXT;
ALTER TABLE "redaction_runs" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "redaction_runs" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "redaction_runs" ADD COLUMN "userAgent" TEXT;

-- Create unique indexes
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");
CREATE UNIQUE INDEX "redaction_templates_name_key" ON "redaction_templates"("name");
CREATE UNIQUE INDEX "detection_history_fieldPath_piiType_key" ON "detection_history"("fieldPath", "piiType");
CREATE UNIQUE INDEX "redaction_profiles_organizationId_name_key" ON "redaction_profiles"("organizationId", "name");

-- Create indexes
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");
CREATE INDEX "api_keys_key_idx" ON "api_keys"("key");
CREATE INDEX "redaction_profiles_organizationId_idx" ON "redaction_profiles"("organizationId");
CREATE INDEX "detection_rules_profileId_idx" ON "detection_rules"("profileId");
CREATE INDEX "redaction_runs_createdAt_idx" ON "redaction_runs"("createdAt");
CREATE INDEX "webhooks_profileId_idx" ON "webhooks"("profileId");
CREATE INDEX "redaction_templates_isPublic_idx" ON "redaction_templates"("isPublic");
CREATE INDEX "redaction_templates_category_idx" ON "redaction_templates"("category");
CREATE INDEX "batch_redaction_jobs_profileId_status_idx" ON "batch_redaction_jobs"("profileId", "status");
CREATE INDEX "batch_redaction_jobs_createdAt_idx" ON "batch_redaction_jobs"("createdAt");
CREATE INDEX "detection_history_piiType_idx" ON "detection_history"("piiType");
CREATE INDEX "detection_history_lastSeenAt_idx" ON "detection_history"("lastSeenAt");
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Add foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "redaction_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "redaction_profiles" ADD CONSTRAINT "redaction_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "redaction_profiles" ADD CONSTRAINT "redaction_profiles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "redaction_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_redaction_jobs" ADD CONSTRAINT "batch_redaction_jobs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "redaction_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
