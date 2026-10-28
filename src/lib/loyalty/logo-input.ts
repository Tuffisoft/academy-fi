import { z } from "zod";

export const maxLogoBytes = 4 * 1024 * 1024;
export const logoFileMetadata = z.object({
  size: z.number().int().positive().max(maxLogoBytes),
  type: z.enum(["image/png", "image/jpeg", "image/webp"]),
});
export function logoFileError(file: { size: number; type: string }) {
  if (logoFileMetadata.safeParse(file).success) return null;
  if (file.size > maxLogoBytes) return "LOGO_TOO_LARGE" as const;
  if (!file.size) return "LOGO_INVALID" as const;
  return "LOGO_UNSUPPORTED" as const;
}
