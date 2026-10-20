export type AuditSummary = {
  id: string;
  userId: string;
  placeId: string;
  status: string;
  qualityScore: number | null;
  checkedAt: string | null;
  errorCode: string | null;
};
