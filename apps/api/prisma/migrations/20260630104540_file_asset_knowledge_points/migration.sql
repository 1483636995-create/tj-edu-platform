-- CreateTable
CREATE TABLE "FileAssetKnowledgePoint" (
    "fileAssetId" UUID NOT NULL,
    "knowledgePointId" UUID NOT NULL,

    CONSTRAINT "FileAssetKnowledgePoint_pkey" PRIMARY KEY ("fileAssetId","knowledgePointId")
);

-- CreateIndex
CREATE INDEX "FileAssetKnowledgePoint_knowledgePointId_idx" ON "FileAssetKnowledgePoint"("knowledgePointId");

-- AddForeignKey
ALTER TABLE "FileAssetKnowledgePoint" ADD CONSTRAINT "FileAssetKnowledgePoint_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAssetKnowledgePoint" ADD CONSTRAINT "FileAssetKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
