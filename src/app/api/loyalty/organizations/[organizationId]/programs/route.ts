import { programHttp } from "@/lib/loyalty/program-http";
export async function POST(request: Request, context: { params: Promise<{ organizationId: string }> }) {
  return programHttp(request, (await context.params).organizationId);
}
