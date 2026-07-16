CREATE TABLE "HandoutDraft" (
    "id" UUID NOT NULL,
    "institutionId" UUID NOT NULL,
    "createdById" UUID,
    "subjectId" UUID NOT NULL,
    "gradeId" UUID,
    "title" VARCHAR(200) NOT NULL,
    "objective" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "HandoutDraft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HandoutDraftKnowledgePoint" (
    "handoutDraftId" UUID NOT NULL,
    "knowledgePointId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HandoutDraftKnowledgePoint_pkey" PRIMARY KEY ("handoutDraftId", "knowledgePointId")
);

CREATE TABLE "HandoutDraftQuestion" (
    "handoutDraftId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HandoutDraftQuestion_pkey" PRIMARY KEY ("handoutDraftId", "questionId")
);

CREATE TABLE "HandoutDraftFile" (
    "handoutDraftId" UUID NOT NULL,
    "fileAssetId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HandoutDraftFile_pkey" PRIMARY KEY ("handoutDraftId", "fileAssetId")
);

CREATE INDEX "HandoutDraft_institutionId_status_updatedAt_idx" ON "HandoutDraft"("institutionId", "status", "updatedAt");
CREATE INDEX "HandoutDraft_subjectId_gradeId_idx" ON "HandoutDraft"("subjectId", "gradeId");
CREATE INDEX "HandoutDraftKnowledgePoint_knowledgePointId_idx" ON "HandoutDraftKnowledgePoint"("knowledgePointId");
CREATE INDEX "HandoutDraftQuestion_questionId_idx" ON "HandoutDraftQuestion"("questionId");
CREATE INDEX "HandoutDraftFile_fileAssetId_idx" ON "HandoutDraftFile"("fileAssetId");

ALTER TABLE "HandoutDraft" ADD CONSTRAINT "HandoutDraft_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoutDraft" ADD CONSTRAINT "HandoutDraft_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HandoutDraft" ADD CONSTRAINT "HandoutDraft_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoutDraft" ADD CONSTRAINT "HandoutDraft_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HandoutDraftKnowledgePoint" ADD CONSTRAINT "HandoutDraftKnowledgePoint_handoutDraftId_fkey" FOREIGN KEY ("handoutDraftId") REFERENCES "HandoutDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoutDraftKnowledgePoint" ADD CONSTRAINT "HandoutDraftKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoutDraftQuestion" ADD CONSTRAINT "HandoutDraftQuestion_handoutDraftId_fkey" FOREIGN KEY ("handoutDraftId") REFERENCES "HandoutDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoutDraftQuestion" ADD CONSTRAINT "HandoutDraftQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HandoutDraftFile" ADD CONSTRAINT "HandoutDraftFile_handoutDraftId_fkey" FOREIGN KEY ("handoutDraftId") REFERENCES "HandoutDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HandoutDraftFile" ADD CONSTRAINT "HandoutDraftFile_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
