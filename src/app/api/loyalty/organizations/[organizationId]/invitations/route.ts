import { membershipPost } from "@/lib/loyalty/membership-http";

export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  return membershipPost(request, (await context.params).organizationId, true);
}
