import "server-only";
import { AwsClient } from "aws4fetch";
import {
  logoObjectKey,
  logoObjectKeySchema,
  r2Configuration,
} from "./logo-storage-config";

function configuration() {
  const parsed = r2Configuration.safeParse({
    endpoint: process.env.STEMPELFI_R2_ENDPOINT,
    bucket: process.env.STEMPELFI_R2_BUCKET_NAME,
    accessKeyId: process.env.STEMPELFI_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.STEMPELFI_R2_SECRET_ACCESS_KEY,
  });
  if (!parsed.success) throw new Error("LOGO_STORAGE_UNAVAILABLE");
  return parsed.data;
}
export function logoObjectUrl(key: string) {
  if (!logoObjectKeySchema.safeParse(key).success)
    throw new Error("LOGO_STORAGE_UNAVAILABLE");
  const config = configuration();
  return new URL(
    `${config.endpoint}/${config.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
  );
}
async function request(
  key: string,
  method: "GET" | "PUT" | "DELETE",
  bytes?: Uint8Array,
) {
  const config = configuration();
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
    retries: 0,
  });
  try {
    const signed = await client.sign(logoObjectUrl(key), {
      method,
      ...(bytes
        ? {
            body: new Uint8Array(bytes),
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "private, no-store",
            },
          }
        : {}),
    });
    const response = await fetch(signed, {
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(method === "PUT" ? 30_000 : 15_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("LOGO_STORAGE_UNAVAILABLE");
    }
    return response;
  } catch {
    throw new Error("LOGO_STORAGE_UNAVAILABLE");
  }
}
export async function putLogoObject(
  bytes: Uint8Array,
  organizationId: string,
  operation: string,
  fingerprint: string,
) {
  const key = logoObjectKey(organizationId, operation, fingerprint);
  const response = await request(key, "PUT", bytes);
  await response.body?.cancel();
  return key;
}
export async function getLogoObject(key: string) {
  return request(key, "GET");
}
/** Cleanup only for known owned synthetic integration-test keys; no public deletion API. */
export async function deleteLogoObject(key: string) {
  const response = await request(key, "DELETE");
  await response.body?.cancel();
}
