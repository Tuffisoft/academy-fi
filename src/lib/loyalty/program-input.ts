import { z } from "zod";

export const resourceId = z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/);
export const operationId = z.string().uuid().transform(value => value.toLowerCase());
export const symbols = ["STAMP", "STAR", "HEART", "GIFT", "COFFEE"] as const;
function text(max: number, required = true) {
  return z.string().max(max * 4).refine(value => !/[\u0000-\u001f\u007f<>]/.test(value))
    .transform(value => value.trim().replace(/\s+/g, " ")).pipe(z.string().min(required ? 1 : 0).max(max));
}
const color = z.string().regex(/^#[0-9a-f]{6}$/i).transform(value => value.toUpperCase());
export function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
export const programConfig = z.object({
  name: text(80), description: text(500, false), reward: text(160),
  target: z.number().int().min(1).max(2147483647),
  backgroundColor: color, textColor: color, symbol: z.enum(symbols), logoAssetId: resourceId.nullable(),
}).strict().refine(value => contrast(value.backgroundColor, value.textColor) >= 4.5, { path: ["textColor"], message: "CONTRAST" });
export type ProgramConfig = z.infer<typeof programConfig>;
export type ProgramView = ProgramConfig & { id: string; revision: number };
export const programCommand = z.object({
  organizationId: resourceId, operationId, programId: resourceId.optional(),
  expectedRevision: z.number().int().positive().optional(), config: programConfig,
}).strict().refine(value => Boolean(value.programId) === Boolean(value.expectedRevision));
export const defaultProgram: ProgramConfig = { name: "", description: "", reward: "", target: 8,
  backgroundColor: "#173A32", textColor: "#FFFFFF", symbol: "STAMP", logoAssetId: null };
