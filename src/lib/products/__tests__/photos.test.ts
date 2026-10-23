import { describe, expect, it } from "vitest";
import { checkPhotoFile, fitWithin, parsePhotoPath, photoPath, PHOTO_MAX_EDGE } from "@/lib/products/photos";

describe("checkPhotoFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])("accepts %s", (type) => {
    expect(checkPhotoFile({ type, size: 3_000_000 })).toEqual({ ok: true });
  });

  it("rejects other file types in Thai", () => {
    const result = checkPhotoFile({ type: "application/pdf", size: 1000 });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/[฀-๿]/);
  });

  it("rejects files over 20MB and empty files", () => {
    expect(checkPhotoFile({ type: "image/jpeg", size: 20 * 1024 * 1024 + 1 }).ok).toBe(false);
    expect(checkPhotoFile({ type: "image/jpeg", size: 0 }).ok).toBe(false);
  });
});

describe("fitWithin", () => {
  it("shrinks the long edge to the limit, keeping the shape", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("never enlarges a small photo", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("rounds to whole pixels and never reaches zero", () => {
    expect(fitWithin(5000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });

  it("uses a sensible default edge", () => {
    expect(PHOTO_MAX_EDGE).toBeGreaterThanOrEqual(1200);
  });
});

describe("photoPath / parsePhotoPath", () => {
  const shopId = "11111111-1111-4111-8111-111111111111";
  const productId = "22222222-2222-4222-8222-222222222222";

  it("puts each photo under its shop and item with a unique name", () => {
    const a = photoPath(shopId, productId, "front");
    const b = photoPath(shopId, productId, "front");
    expect(a).toMatch(new RegExp(`^${shopId}/${productId}/front-[0-9a-f-]{36}\\.webp$`));
    expect(a).not.toBe(b);
  });

  it("reads a path back into its parts", () => {
    const path = photoPath(shopId, productId, "flaw");
    expect(parsePhotoPath(path)).toEqual({ shopId, productId, kind: "flaw" });
  });

  it.each([
    "../etc/passwd",
    `${shopId}/${productId}/front.webp`,
    `${shopId}/${productId}/selfie-${crypto.randomUUID()}.webp`,
    `${shopId}/${productId}/front-${crypto.randomUUID()}.png`,
    `not-a-uuid/${productId}/front-${crypto.randomUUID()}.webp`,
    `${shopId}/${productId}/extra/front-${crypto.randomUUID()}.webp`,
  ])("refuses paths that were not made by photoPath: %s", (path) => {
    expect(parsePhotoPath(path)).toBeNull();
  });
});
