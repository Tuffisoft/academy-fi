import { leadSearchScope } from "./search-input";

export type AuditControl = "pause" | "resume" | "cancel";
export function auditControlScope(user: { id: string; role?: string | null }, userId: unknown, batchId: unknown) {
  if (typeof userId !== "string" || !userId || userId.length > 128 || typeof batchId !== "string" || !batchId || batchId.length > 128) return null;
  return { userId, batchId, ...leadSearchScope(user) };
}
export const auditControlTransitions = {
  pause: { from: ["QUEUED"], to: "PAUSED" },
  resume: { from: ["PAUSED"], to: "QUEUED" },
  cancel: { from: ["QUEUED", "RUNNING", "PAUSED"], to: "CANCELLED" },
} as const;
