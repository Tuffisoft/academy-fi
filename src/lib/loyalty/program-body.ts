import { ProgramError } from "./programs";

/** Bounded stream reader shared by the HTTP adapter and private provider-image reader. */
export async function boundedBody(
  request: Pick<Request, "body" | "headers">,
  limit: number,
) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new ProgramError("INVALID_INPUT");
  const reader = request.body?.getReader();
  if (!reader) throw new ProgramError("INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > limit) {
      await reader.cancel();
      throw new ProgramError("INVALID_INPUT");
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks);
}
