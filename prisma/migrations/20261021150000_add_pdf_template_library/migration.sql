CREATE TABLE "PdfReportTemplate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "source" TEXT NOT NULL,
  "theme" VARCHAR(20) NOT NULL DEFAULT 'modern',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfReportTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PdfReportTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PdfReportTemplate_userId_updatedAt_idx" ON "PdfReportTemplate"("userId", "updatedAt");
ALTER TABLE "PdfReportDesign" ADD COLUMN "templateId" TEXT;
ALTER TABLE "PdfReportDesign" ADD CONSTRAINT "PdfReportDesign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PdfReportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve each user's exact saved design as their first selectable template.
INSERT INTO "PdfReportTemplate" ("id", "userId", "name", "source", "theme", "createdAt", "updatedAt")
SELECT 'initial-' || "userId", "userId", "name", "source", "theme", "createdAt", "updatedAt" FROM "PdfReportDesign";
UPDATE "PdfReportDesign" SET "templateId" = 'initial-' || "userId";
