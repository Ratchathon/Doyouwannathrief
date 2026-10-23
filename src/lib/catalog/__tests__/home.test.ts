// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
const { toHomeShop } = await import("@/lib/catalog/home");

describe("toHomeShop", () => {
  const base = { slug: "s", display_name: "S", province: "ภูเก็ต" };

  it("labels the shop with its first style by position", () => {
    expect(
      toHomeShop({
        ...base,
        shop_styles: [{ styles: { name_en: "Y2K", position: 4 } }, { styles: { name_en: "Vintage", position: 2 } }],
      }),
    ).toEqual({ ...base, style: "Vintage" });
  });

  it("has no style label when the shop has none", () => {
    expect(toHomeShop({ ...base, shop_styles: [] })).toEqual({ ...base, style: null });
    expect(toHomeShop({ ...base, shop_styles: null })).toEqual({ ...base, style: null });
    expect(toHomeShop({ ...base, shop_styles: [{ styles: null }] })).toEqual({ ...base, style: null });
  });
});
