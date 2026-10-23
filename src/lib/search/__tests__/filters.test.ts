import { describe, expect, it } from "vitest";
import { PRICE_PRESETS, activeFilters, clearHref, filterHref, priceLabel } from "@/lib/search/filters";

const p = (s: string) => new URLSearchParams(s);

describe("filterHref", () => {
  it("sets a filter, keeps the others and goes back to page 1", () => {
    expect(filterHref("/search", p("q=jeans&page=3&sort=price_asc"), { size: "32" })).toBe(
      "/search?q=jeans&sort=price_asc&size=32",
    );
  });

  it("removes a filter when given null", () => {
    expect(filterHref("/search", p("q=jeans&size=32"), { size: null })).toBe("/search?q=jeans");
  });

  it("sets several at once (a price range)", () => {
    expect(filterHref("/styles/y2k", p(""), { min: "500", max: "1000" })).toBe("/styles/y2k?min=500&max=1000");
  });
});

describe("priceLabel", () => {
  it.each([
    [null, 500, "ต่ำกว่า ฿500"],
    [500, 1000, "฿500–1,000"],
    [2000, null, "เกิน ฿2,000"],
    [null, null, null],
  ])("%s–%s → %s", (min, max, label) => {
    expect(priceLabel(min, max)).toBe(label);
  });

  it("matches the presets", () => {
    expect(PRICE_PRESETS.map((x) => priceLabel(x.min, x.max))).toEqual([
      "ต่ำกว่า ฿500",
      "฿500–1,000",
      "฿1,000–2,000",
      "เกิน ฿2,000",
    ]);
  });
});

describe("activeFilters", () => {
  it("describes each filter in use with a link that removes it", () => {
    const filters = activeFilters("/search", p("q=jeans&category=denim&size=32&min=500&max=1000&province=เชียงใหม่"), "search");
    expect(filters.map((f) => f.label)).toEqual(["DENIM", "SIZE 32", "฿500–1,000", "เชียงใหม่"]);
    expect(filters[2].removeHref).toBe(
      `/search?q=jeans&category=denim&size=32&province=${encodeURIComponent("เชียงใหม่")}`,
    );
  });

  it("gives each chosen value its own chip that removes just that value", () => {
    const filters = activeFilters("/search", p("q=jeans&category=denim,tees&size=32,34"), "search");
    expect(filters.map((f) => f.label)).toEqual(["DENIM", "TEES", "SIZE 32", "SIZE 34"]);
    expect(filters[1].removeHref).toBe("/search?q=jeans&category=denim&size=32%2C34");
    expect(filters[3].removeHref).toBe("/search?q=jeans&category=denim%2Ctees&size=32");
  });

  it("does not offer to remove the category a category page is about", () => {
    expect(activeFilters("/categories/denim", p("category=denim&size=32"), "category").map((f) => f.label)).toEqual(["SIZE 32"]);
  });

  it("ignores invalid values", () => {
    expect(activeFilters("/search", p("category=spaceships&min=abc&province=Atlantis"), "search")).toEqual([]);
  });
});

describe("clearHref", () => {
  it("keeps only the search words and sort order", () => {
    expect(clearHref("/search", p("q=jeans&sort=price_asc&size=32&min=500&page=2"))).toBe("/search?q=jeans&sort=price_asc");
    expect(clearHref("/styles/y2k", p("size=M"))).toBe("/styles/y2k");
  });
});
