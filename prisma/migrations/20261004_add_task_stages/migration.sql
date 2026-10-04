-- CreateTable TaskStage
CREATE TABLE "TaskStage" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "documentation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskStage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskStage" ADD CONSTRAINT "TaskStage_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "AssignmentChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
