import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { contrast, defaultProgram, programConfig, programCommand } from "../src/lib/loyalty/program-input";
import { normalizeLogo } from "../src/lib/loyalty/logo";

const config = { ...defaultProgram, name: "  Coffee   club  ", reward: "Free coffee" };
test("text limits reject oversized raw input before normalization, including large payloads", () => {
  for (const [field, limit] of [["name", 40], ["description", 70], ["reward", 40]] as const) {
    assert.ok(programConfig.safeParse({ ...config, [field]: "a".repeat(limit) }).success);
    for (const value of ["a".repeat(limit + 1), " ".repeat(limit) + "a", "a".repeat(1_000_000)]) {
      assert.equal(programConfig.safeParse({ ...config, [field]: value }).success, false, field);
    }
  }
});
test("program validation normalizes text and colors, preserves integer boundaries", () => {
  assert.equal(programConfig.parse(config).name, "Coffee club");
  assert.equal(programConfig.parse({ ...config, backgroundColor: "#173a32" }).backgroundColor, "#173A32");
  assert.ok(programConfig.safeParse({ ...config, target: 2147483647 }).success);
  for (const target of [0, -1, 1.5, NaN, Infinity, 2147483648, "8"]) assert.equal(programConfig.safeParse({ ...config, target }).success, false);
  for (const name of ["", " ", "a".repeat(41), "<img>", "Hi\nthere", "bad\u0000"]) assert.equal(programConfig.safeParse({ ...config, name }).success, false);
  assert.equal(programConfig.safeParse({ ...config, reward: "" }).success, false);
  assert.equal(programConfig.safeParse({ ...config, description: "a".repeat(71) }).success, false);
  assert.equal(programConfig.safeParse({ ...config, symbol: "HTML" }).success, false);
  assert.equal(programConfig.safeParse({ ...config, logoAssetId: "https://example.invalid/image" }).success, false);
});
test("contrast blocks unreadable pairs and requires full HEX colors", () => {
  assert.equal(contrast("#000000", "#FFFFFF"), 21);
  for (const textColor of ["#173A32", "#fff", "red", "#GGGGGG"]) assert.equal(programConfig.safeParse({ ...config, textColor }).success, false);
});
test("commands require revision only for updates and reject injected fields", () => {
  const command = { organizationId: "org", operationId: "01a17ce5-5da3-4dd2-8ad0-31b92cc6db5e", config };
  assert.ok(programCommand.safeParse(command).success);
  assert.equal(programCommand.safeParse({ ...command, programId: "program" }).success, false);
  assert.equal(programCommand.safeParse({ ...command, role: "OWNER" }).success, false);
  assert.ok(programCommand.safeParse({ ...command, programId: "program", expectedRevision: 1 }).success);
});
test("logo rasterization strips metadata, preserves aspect ratio and rejects unsafe inputs", async () => {
  const input = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: "red" } }).withMetadata().png().toBuffer();
  const result = await normalizeLogo(input, "image/png");
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 1024); assert.equal(metadata.height, 512); assert.equal(metadata.format, "png");
  assert.equal(metadata.exif, undefined); assert.equal(metadata.icc, undefined);
  await assert.rejects(normalizeLogo(input, "image/jpeg"));
  await assert.rejects(normalizeLogo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), "image/svg+xml"));
  await assert.rejects(normalizeLogo(Buffer.from("not an image"), "image/png"));
  await assert.rejects(normalizeLogo(new Uint8Array(4 * 1024 * 1024 + 1), "image/png"));
  const large = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(normalizeLogo(large, "image/png"));
  const frames = Buffer.from([255, 0, 0, 0, 0, 255]);
  const animated = await sharp(frames, { raw: { width: 1, height: 2, channels: 3, pageHeight: 1 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  await assert.rejects(normalizeLogo(animated, "image/webp"));
});
