// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
const { toResultItem, toResultShop, pageLinks } = await import("@/lib/catalog/results");

describe("toResultItem", () => {
  const row = {
    id: "i1",
    title: "โปโล",
    brand: "Lacoste",
    price_satang: 89000,
    size_label: "M",
    status: "active",
    shop_slug: "s",
    shop_name: "S",
    front_path: "i1/front.webp",
  };

  it("turns the front photo path into a public URL", () => {
    expect(toResultItem(row, "https://x.supabase.co").photo).toBe(
      "https://x.supabase.co/storage/v1/object/public/product-photos/i1/front.webp",
    );
  });

  it("has no photo when the item has none", () => {
    expect(toResultItem({ ...row, front_path: null }, "https://x").photo).toBeNull();
  });
});

describe("toResultShop", () => {
  it("labels the shop with the English name of its first style", () => {
    const names = new Map([["vintage", "Vintage"], ["y2k", "Y2K"]]);
    expect(
      toResultShop({ slug: "s", display_name: "S", province: "ภูเก็ต", styles: ["y2k", "vintage"], match_count: 2 }, names),
    ).toEqual({ slug: "s", display_name: "S", province: "ภูเก็ต", style: "Y2K", match_count: 2 });
  });

  it("copes with unknown or missing styles", () => {
    const shop = toResultShop({ slug: "s", display_name: "S", province: "x", styles: ["gone"], match_count: 0 }, new Map());
    expect(shop.style).toBeNull();
    expect(toResultShop({ slug: "s", display_name: "S", province: "x", styles: null, match_count: 0 }, new Map()).style).toBeNull();
  });
});

describe("pageLinks", () => {
  const p = (s: string) => new URLSearchParams(s);

  it("has only a next link on page 1 when there are more", () => {
    expect(pageLinks("/search", p("q=polo"), true)).toEqual({ prevHref: null, nextHref: "/search?q=polo&page=2" });
  });

  it("has a previous link after page 1 and no next link on the last page", () => {
    expect(pageLinks("/search", p("q=polo&page=3"), false)).toEqual({ prevHref: "/search?q=polo&page=2", nextHref: null });
  });

  it("treats a bad page number as page 1", () => {
    expect(pageLinks("/search", p("page=abc"), false)).toEqual({ prevHref: null, nextHref: null });
  });
});
