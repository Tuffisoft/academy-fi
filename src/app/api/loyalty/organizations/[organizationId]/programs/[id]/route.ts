import { programHttp } from "@/lib/loyalty/program-http";
export async function PATCH(request: Request, context: { params: Promise<{ organizationId: string; id: string }> }) {
  const { organizationId, id } = await context.params;
  return programHttp(request, organizationId, id);
}
