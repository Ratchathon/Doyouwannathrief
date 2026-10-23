// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
const { categoryCounts, socialPlatform, toProductPage, shopArgs } = await import("@/lib/catalog/shop");

describe("categoryCounts", () => {
  it("counts items per category in menu order, leaving out empty ones", () => {
    expect(categoryCounts(["denim", "tees", "tees", "headwear"])).toEqual([
      { value: "tees", en: "TEES", n: 2 },
      { value: "denim", en: "DENIM", n: 1 },
      { value: "headwear", en: "HEADWEAR", n: 1 },
    ]);
  });
});

describe("socialPlatform", () => {
  it.each([
    ["https://www.instagram.com/x", "Instagram"],
    ["https://m.facebook.com/x", "Facebook"],
    ["https://www.tiktok.com/@x", "TikTok"],
    ["https://example.com/x", null],
  ])("%s is %s", (url, name) => {
    expect(socialPlatform(url)).toBe(name);
  });
});

describe("shopArgs", () => {
  const p = (s: string) => new URLSearchParams(s);
  it("reads a valid category and sort, ignoring junk", () => {
    expect(shopArgs(p("category=denim&sort=price_asc"))).toEqual({ category: "denim", sort: "price_asc" });
    expect(shopArgs(p("category=spaceships&sort=evil"))).toEqual({ category: null, sort: "newest" });
  });
});

describe("toProductPage", () => {
  const row = {
    id: "i1",
    title: "เสื้อ",
    brand: "Lee",
    description: "ผ้าหนา",
    category: "tees",
    size_label: "L",
    price_satang: 89000,
    condition: "good",
    has_flaws: true,
    flaws_note: "รูเล็ก",
    chest_cm: 56,
    length_cm: 74,
    shoulder_cm: null,
    waist_cm: null,
    status: "active",
    shops: { slug: "s", display_name: "S", province: "ภูเก็ต" },
    product_images: [
      { kind: "flaw", storage_path: "samples/s/1-flaw.webp", position: 0 },
      { kind: "front", storage_path: "samples/s/1-front.webp", position: 0 },
      { kind: "label", storage_path: "samples/s/1-label.webp", position: 0 },
      { kind: "back", storage_path: "samples/s/1-back.webp", position: 0 },
    ],
    product_styles: [{ styles: { slug: "vintage", name_en: "Vintage", position: 2 } }],
  };

  it("orders photos front, back, label, flaw and builds their URLs", () => {
    const page = toProductPage(row, "https://x.supabase.co");
    expect(page.photos.map((p) => p.kind)).toEqual(["front", "back", "label", "flaw"]);
    expect(page.photos[0].url).toBe("/samples/s/1-front.webp");
  });

  it("lists only the measurements that were given", () => {
    expect(toProductPage(row, "u").measurements).toEqual([
      { label: "อก", cm: 56 },
      { label: "ยาว", cm: 74 },
    ]);
  });

  it("labels condition and category in Thai and English", () => {
    const page = toProductPage(row, "u");
    expect(page.conditionLabel).toBe("สภาพดี");
    expect(page.category).toEqual({ value: "tees", en: "TEES" });
    expect(page.styles).toEqual([{ slug: "vintage", en: "VINTAGE" }]);
  });
});
