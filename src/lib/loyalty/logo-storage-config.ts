import { z } from "zod";
import { operationId, resourceId } from "./program-input";

const secret = z.string().trim().min(16).max(256).regex(/^\S+$/);
export const r2Configuration = z
  .object({
    endpoint: z.string().url(),
    bucket: z
      .string()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
    accessKeyId: secret,
    secretAccessKey: secret,
  })
  .superRefine((value, context) => {
    let url: URL;
    try {
      url = new URL(value.endpoint);
    } catch {
      context.addIssue({
        code: "custom",
        path: ["endpoint"],
        message: "INVALID_R2_ENDPOINT",
      });
      return;
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !/^[a-f0-9]{32}(?:\.(?:eu|us|fedramp))?\.r2\.cloudflarestorage\.com$/.test(
        url.hostname,
      ) ||
      !["", "/", `/${value.bucket}`, `/${value.bucket}/`].includes(url.pathname)
    ) {
      context.addIssue({
        code: "custom",
        path: ["endpoint"],
        message: "INVALID_R2_ENDPOINT",
      });
    }
  })
  .transform((value) => ({
    ...value,
    endpoint: new URL(value.endpoint).origin,
  }));

export const logoObjectKeySchema = z
  .string()
  .max(512)
  .regex(
    /^stempelfi\/logos\/[a-zA-Z0-9_-]{1,160}\/[a-f0-9-]{36}\/[a-f0-9]{64}\.png$/,
  );
export function logoObjectKey(
  organizationId: string,
  operation: string,
  fingerprint: string,
) {
  return logoObjectKeySchema.parse(
    `stempelfi/logos/${resourceId.parse(organizationId)}/${operationId.parse(operation)}/${z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(fingerprint)}.png`,
  );
}
