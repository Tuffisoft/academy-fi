import { programLifecycleHttp } from "@/lib/loyalty/program-http";

export async function POST(request: Request, context: { params: Promise<{ organizationId: string; id: string }> }) {
  const { organizationId, id } = await context.params;
  return programLifecycleHttp(request, organizationId, id);
}
