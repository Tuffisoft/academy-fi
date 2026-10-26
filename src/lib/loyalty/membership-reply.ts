export const membershipErrors = ["DISABLED", "UNAUTHENTICATED", "INVALID_INPUT", "INVALID_INVITATION", "FORBIDDEN", "LIMIT_REACHED", "CONFLICT", "RATE_LIMITED", "UNAVAILABLE"] as const;
export type MembershipErrorCode = typeof membershipErrors[number];
export const deliveryStates = ["NOT_SENT", "PROVIDER_ACCEPTED", "FAILED", "UNKNOWN"] as const;
export type DeliveryState = typeof deliveryStates[number];
export type MembershipReply = { ok: true; data: { resultId: string; replayed: boolean; deliveryStatus: DeliveryState | null } } | { ok: false; error: { code: MembershipErrorCode; message: string } };

export function isMembershipReply(raw: unknown): raw is MembershipReply {
  if (!raw || typeof raw !== "object" || !("ok" in raw)) return false;
  if (raw.ok === false && "error" in raw && raw.error && typeof raw.error === "object" && "code" in raw.error && "message" in raw.error) {
    const error = raw.error;
    return membershipErrors.some(code => code === error.code) && typeof error.message === "string";
  }
  if (raw.ok !== true || !("data" in raw) || !raw.data || typeof raw.data !== "object") return false;
  const data = raw.data;
  return "resultId" in data && typeof data.resultId === "string" && "replayed" in data && typeof data.replayed === "boolean" && "deliveryStatus" in data && (data.deliveryStatus === null || deliveryStates.some(status => status === data.deliveryStatus));
}
