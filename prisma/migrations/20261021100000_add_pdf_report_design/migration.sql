CREATE TABLE "PdfReportDesign" (
  "userId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "theme" VARCHAR(20) NOT NULL DEFAULT 'modern',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PdfReportDesign_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "PdfReportDesign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
