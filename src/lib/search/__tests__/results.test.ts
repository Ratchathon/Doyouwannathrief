import { describe, expect, it } from "vitest";
import { formatBaht, photoUrl, resultsArgs, pageHref } from "@/lib/search/results";
import { PAGE_SIZE } from "@/lib/search/params";

const params = (s: string) => new URLSearchParams(s);

describe("formatBaht", () => {
  it.each([
    [89000, "฿890"],
    [119000, "฿1,190"],
    [100000000, "฿1,000,000"],
  ])("formats %i satang as %s", (satang, text) => {
    expect(formatBaht(satang)).toBe(text);
  });
});

describe("photoUrl", () => {
  it("builds the public URL of a product photo", () => {
    expect(photoUrl("https://x.supabase.co", "abc/front.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/product-photos/abc/front.webp",
    );
  });

  it("serves sample shop photos from the site itself", () => {
    expect(photoUrl("https://x.supabase.co", "samples/tuekdaeng/1-front.webp")).toBe("/samples/tuekdaeng/1-front.webp");
  });

  it("encodes each path segment but keeps the slashes", () => {
    expect(photoUrl("https://x.supabase.co", "a b/ฟ.webp")).toBe(
      "https://x.supabase.co/storage/v1/object/public/product-photos/a%20b/%E0%B8%9F.webp",
    );
  });
});

describe("resultsArgs", () => {
  it("searches by the typed words, fetching one extra item to know if there are more", () => {
    const args = resultsArgs({ kind: "search" }, params("q=polo&sort=price_asc&page=2"));
    expect(args.items).toMatchObject({ p_query: "polo", p_sort: "price_asc", p_limit: PAGE_SIZE + 1, p_offset: PAGE_SIZE });
    expect(args.shops).toEqual({
      p_query: "polo",
      p_style: null,
      p_category: null,
      p_province: null,
      p_limit: 20,
      p_min_satang: null,
      p_max_satang: null,
      p_size: null,
      p_categories: null,
      p_sizes: null,
    });
  });

  it("fixes the style from the route, ignoring a style in the URL", () => {
    const args = resultsArgs({ kind: "style", slug: "vintage" }, params("style=y2k&q=levis"));
    expect(args.items).toMatchObject({ p_style: "vintage", p_query: "levis" });
    expect(args.shops).toMatchObject({ p_style: "vintage", p_query: "levis" });
  });

  it("fixes the category from the route", () => {
    const args = resultsArgs({ kind: "category", category: "denim" }, params("category=shoes"));
    expect(args.items).toMatchObject({ p_category: "denim" });
    expect(args.shops).toMatchObject({ p_category: "denim" });
  });

  it("lets the search page narrow by category from the URL", () => {
    expect(resultsArgs({ kind: "search" }, params("q=polo&category=tees,sweats")).items.p_categories).toEqual(["tees", "sweats"]);
  });

  it("ignores URL categories on a category page", () => {
    const args = resultsArgs({ kind: "category", category: "denim" }, params("category=tees"));
    expect(args.items).toMatchObject({ p_category: "denim", p_categories: null });
  });
});

describe("resultsArgs filters", () => {
  it("passes price and size to the shop counts and leaves size out of the size list", () => {
    const args = resultsArgs({ kind: "search" }, params("q=jeans&min=500&max=1000&size=32,34&category=denim"));
    expect(args.shops).toMatchObject({ p_min_satang: 50000, p_max_satang: 100000, p_sizes: ["32", "34"], p_categories: ["denim"] });
    expect(args.facets).toEqual({
      p_query: "jeans",
      p_category: null,
      p_style: null,
      p_province: null,
      p_min_satang: 50000,
      p_max_satang: 100000,
      p_categories: ["denim"],
    });
  });
});

describe("pageHref", () => {
  it("keeps the filters and sets the page", () => {
    expect(pageHref("/search", params("q=polo&sort=price_asc&page=1"), 2)).toBe("/search?q=polo&sort=price_asc&page=2");
  });

  it("drops the page number for page 1", () => {
    expect(pageHref("/styles/vintage", params("page=3"), 1)).toBe("/styles/vintage");
  });
});
