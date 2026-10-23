export const loyaltyPlans = {
  FREE: { programs: 1, users: 1, cards: 100 },
  PRO: { programs: 5, users: 5, cards: 1_000 },
  BUSINESS: { programs: null, users: 20, cards: 10_000 },
} as const;

export function freeEntitlement(plan: string) {
  // Fail closed on unexpected or manually inserted paid states until billing exists.
  if (plan !== "FREE") throw new Error("Unconfirmed loyalty entitlement");
  return loyaltyPlans.FREE;
}
