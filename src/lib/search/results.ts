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
};

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
export function resultsArgs(scope: ResultsScope, params: URLSearchParams): { items: ItemSearchArgs; shops: RelatedShopArgs } {
  const parsed = parseItemSearch(params);
  const items: ItemSearchArgs = {
    ...parsed,
    p_style: scope.kind === "style" ? scope.slug : scope.kind === "search" ? parsed.p_style : null,
    p_category: scope.kind === "category" ? scope.category : scope.kind === "search" ? parsed.p_category : null,
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
