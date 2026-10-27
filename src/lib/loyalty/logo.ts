import sharp from "sharp";

export const maxLogoBytes = 4 * 1024 * 1024;
export async function normalizeLogo(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > maxLogoBytes) throw new Error("INVALID_LOGO");
  const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: true, failOn: "warning" });
  const metadata = await image.metadata();
  const formats: Record<string, string> = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" };
  if (!formats[mime] || formats[mime] !== metadata.format || !metadata.width || !metadata.height ||
    metadata.width * metadata.height > 16_000_000 || (metadata.pages ?? 1) !== 1) throw new Error("INVALID_LOGO");
  return image.rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).png().toBuffer();
}
