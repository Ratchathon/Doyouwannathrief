import type { Category } from "@/lib/products/listing";
import { PHOTO_BUCKET } from "@/lib/products/photos";
import { PAGE_SIZE, parseItemSearch, type ItemSearchArgs } from "@/lib/search/params";

export const RELATED_SHOP_LIMIT = 20;

/** What fixes the result set: free search, a style page or a category page. */
export type ResultsScope = { kind: "search" } | { kind: "style"; slug: string } | { kind: "category"; category: Category };

export type RelatedShopArgs = {
  p_query: string | null;
  p_style: string | null;
  p_category: Category | null;
  p_province: string | null;
  p_limit: number;
  p_min_satang: number | null;
  p_max_satang: number | null;
  p_size: string | null;
  p_categories: Category[] | null;
  p_sizes: string[] | null;
};

/** Arguments for listing the sizes present in the results (the size filter itself is left out). */
export type FacetArgs = Pick<
  ItemSearchArgs,
  "p_query" | "p_category" | "p_style" | "p_province" | "p_min_satang" | "p_max_satang" | "p_categories"
>;

const baht = new Intl.NumberFormat("en-US");

export function formatBaht(satang: number): string {
  return `฿${baht.format(Math.round(satang / 100))}`;
}

/** Sample shops' photos ship with the site (public/samples) instead of living in storage. */
const SAMPLE_PREFIX = "samples/";

export function photoUrl(supabaseUrl: string, path: string): string {
  if (path.startsWith(SAMPLE_PREFIX)) return `/${path}`;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl}/storage/v1/object/public/${PHOTO_BUCKET}/${encoded}`;
}

/** Database arguments for a results page. Asks for one extra item to tell whether a next page exists. */
export function resultsArgs(
  scope: ResultsScope,
  params: URLSearchParams,
): { items: ItemSearchArgs; shops: RelatedShopArgs; facets: FacetArgs } {
  const parsed = parseItemSearch(params);
  const items: ItemSearchArgs = {
    ...parsed,
    p_style: scope.kind === "style" ? scope.slug : scope.kind === "search" ? parsed.p_style : null,
    p_category: scope.kind === "category" ? scope.category : null,
    p_categories: scope.kind === "category" ? null : parsed.p_categories,
    p_limit: PAGE_SIZE + 1,
  };
  return {
    items,
    shops: {
      p_query: items.p_query,
      p_style: items.p_style,
      p_category: items.p_category,
      p_province: items.p_province,
      p_limit: RELATED_SHOP_LIMIT,
      p_min_satang: items.p_min_satang,
      p_max_satang: items.p_max_satang,
      p_size: items.p_size,
      p_categories: items.p_categories,
      p_sizes: items.p_sizes,
    },
    facets: {
      p_query: items.p_query,
      p_category: items.p_category,
      p_style: items.p_style,
      p_province: items.p_province,
      p_min_satang: items.p_min_satang,
      p_max_satang: items.p_max_satang,
      p_categories: items.p_categories,
    },
  };
}

export function pageHref(path: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}
