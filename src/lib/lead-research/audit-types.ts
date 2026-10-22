import type { QualityParts } from "./website-rating";
export type AuditSummary = {
  id: string;
  userId: string;
  placeId: string;
  status: string;
  qualityScore: number | null;
  parts?: QualityParts;
  checkedAt: string | null;
  errorCode: string | null;
  batchId: string;
  startedAt: string | null;
  updatedAt: string;
};
