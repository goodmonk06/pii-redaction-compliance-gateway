-- CreateTable
CREATE TABLE "redaction_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rulesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redaction_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detection_rules" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fieldPattern" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "maskStyleJson" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "detection_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redaction_runs" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "inputSampleJson" JSONB NOT NULL,
    "outputSampleJson" JSONB NOT NULL,
    "statsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redaction_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "redaction_profiles_name_key" ON "redaction_profiles"("name");

-- CreateIndex
CREATE INDEX "redaction_runs_profileId_createdAt_idx" ON "redaction_runs"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "detection_rules" ADD CONSTRAINT "detection_rules_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "redaction_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redaction_runs" ADD CONSTRAINT "redaction_runs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "redaction_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
