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
    ).toEqual({ ...base, style: "Vintage", isNew: false });
  });

  it("has no style label when the shop has none", () => {
    expect(toHomeShop({ ...base, shop_styles: [] })).toEqual({ ...base, style: null, isNew: false });
    expect(toHomeShop({ ...base, shop_styles: null })).toEqual({ ...base, style: null, isNew: false });
    expect(toHomeShop({ ...base, shop_styles: [{ styles: null }] })).toEqual({ ...base, style: null, isNew: false });
  });

  it("marks shops approved in the last 14 days as new", () => {
    const recent = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    expect(toHomeShop({ ...base, approved_at: recent, shop_styles: [] }).isNew).toBe(true);
    expect(toHomeShop({ ...base, approved_at: old, shop_styles: [] }).isNew).toBe(false);
  });
});
