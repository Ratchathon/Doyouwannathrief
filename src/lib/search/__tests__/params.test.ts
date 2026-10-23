import { describe, expect, it } from "vitest";
import { PAGE_SIZE, parseItemSearch, parseShopSearch } from "@/lib/search/params";

const params = (query: string) => new URLSearchParams(query);

describe("parseItemSearch", () => {
  it("defaults to the newest items, first page", () => {
    expect(parseItemSearch(params(""))).toEqual({
      p_query: null,
      p_category: null,
      p_style: null,
      p_province: null,
      p_min_satang: null,
      p_max_satang: null,
      p_size: null,
      p_sort: "newest",
      p_limit: PAGE_SIZE,
      p_offset: 0,
    });
  });

  it("reads every filter", () => {
    const args = parseItemSearch(
      params("q=+levi++เดนิม+&category=tops_shirts&style=vintage&province=เชียงใหม่&min=500&max=1,500&size=M&sort=price_asc&page=3"),
    );
    expect(args).toEqual({
      p_query: "levi เดนิม",
      p_category: "tops_shirts",
      p_style: "vintage",
      p_province: "เชียงใหม่",
      p_min_satang: 50000,
      p_max_satang: 150000,
      p_size: "M",
      p_sort: "price_asc",
      p_limit: PAGE_SIZE,
      p_offset: PAGE_SIZE * 2,
    });
  });

  it.each([
    ["category=spaceships", "p_category"],
    ["style=Vintage!", "p_style"],
    ["province=Atlantis", "p_province"],
    ["min=cheap", "p_min_satang"],
    ["max=-5", "p_max_satang"],
    ["sort=random", "p_sort"],
  ])("ignores a bad value: %s", (query, key) => {
    const args = parseItemSearch(params(query));
    const defaults = parseItemSearch(params(""));
    expect(args[key as keyof typeof args]).toEqual(defaults[key as keyof typeof defaults]);
  });

  it.each(["page=0", "page=-2", "page=abc", "page=1.5", "page=99999"])("keeps the page sensible: %s", (query) => {
    const { p_offset } = parseItemSearch(params(query));
    expect(p_offset).toBeGreaterThanOrEqual(0);
    expect(p_offset).toBeLessThanOrEqual(PAGE_SIZE * 99);
  });

  it("caps very long search text", () => {
    expect(parseItemSearch(params(`q=${"ก".repeat(500)}`)).p_query).toHaveLength(100);
  });

  it("swaps a min price above the max price", () => {
    const args = parseItemSearch(params("min=2000&max=500"));
    expect([args.p_min_satang, args.p_max_satang]).toEqual([50000, 200000]);
  });
});

describe("parseShopSearch", () => {
  it("reads query, style, province and page", () => {
    expect(parseShopSearch(params("q=ตึกแดง&style=vintage&province=กรุงเทพมหานคร&page=2"))).toEqual({
      p_query: "ตึกแดง",
      p_style: "vintage",
      p_province: "กรุงเทพมหานคร",
      p_limit: PAGE_SIZE,
      p_offset: PAGE_SIZE,
    });
  });
});
