-- AlterTable
ALTER TABLE "UsageLedger" ADD COLUMN     "aiFeature" TEXT,
ADD COLUMN     "aiModel" TEXT,
ADD COLUMN     "completionTokens" INTEGER,
ADD COLUMN     "promptTokens" INTEGER,
ADD COLUMN     "totalTokens" INTEGER,
ALTER COLUMN "entitlementId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AiKnowledgeDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'manual',
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "content" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "error" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiKnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiKnowledgeChunk" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embeddingJson" TEXT NOT NULL,
    "embeddingModel" TEXT NOT NULL DEFAULT 'local-hash-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiKnowledgeDocument_tenantId_status_idx" ON "AiKnowledgeDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AiKnowledgeDocument_tenantId_createdAt_idx" ON "AiKnowledgeDocument"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AiKnowledgeChunk_tenantId_idx" ON "AiKnowledgeChunk"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "AiKnowledgeChunk_documentId_idx_key" ON "AiKnowledgeChunk"("documentId", "idx");

-- CreateIndex
CREATE INDEX "UsageLedger_tenantId_occurredAt_idx" ON "UsageLedger"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "UsageLedger_usageType_occurredAt_idx" ON "UsageLedger"("usageType", "occurredAt");

-- AddForeignKey
ALTER TABLE "AiKnowledgeChunk" ADD CONSTRAINT "AiKnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AiKnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
