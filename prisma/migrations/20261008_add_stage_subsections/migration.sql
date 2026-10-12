-- AlterTable
ALTER TABLE "DailyPlanStage" ADD COLUMN "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "DailyPlanStage" ADD CONSTRAINT "DailyPlanStage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DailyPlanStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
