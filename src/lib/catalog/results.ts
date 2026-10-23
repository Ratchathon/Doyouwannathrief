import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { ResultItem, ResultShop } from "@/components/results-view";
import { PAGE_SIZE, type ItemSearchArgs } from "@/lib/search/params";
import { pageHref, photoUrl, type RelatedShopArgs } from "@/lib/search/results";
import { supabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

type ItemRow = Omit<ResultItem, "photo"> & { front_path: string | null };
type ShopRow = Omit<ResultShop, "style"> & { styles: string[] | null };

export function toResultItem(row: ItemRow, supabaseUrl: string): ResultItem {
  const { front_path, ...rest } = row;
  return {
    id: rest.id,
    title: rest.title,
    brand: rest.brand,
    price_satang: rest.price_satang,
    size_label: rest.size_label,
    status: rest.status,
    shop_slug: rest.shop_slug,
    shop_name: rest.shop_name,
    photo: front_path ? photoUrl(supabaseUrl, front_path) : null,
  };
}

export function toResultShop(row: ShopRow, styleNames: Map<string, string>): ResultShop {
  const first = (row.styles ?? []).map((slug) => styleNames.get(slug)).find((name) => name !== undefined);
  return {
    slug: row.slug,
    display_name: row.display_name,
    province: row.province,
    style: first ? first.toUpperCase() : null,
    match_count: row.match_count,
  };
}

export function pageLinks(path: string, params: URLSearchParams, hasMore: boolean) {
  const raw = params.get("page") ?? "1";
  const page = /^\d+$/.test(raw) && Number(raw) >= 1 ? Number(raw) : 1;
  return {
    prevHref: page > 1 ? pageHref(path, params, page - 1) : null,
    nextHref: hasMore ? pageHref(path, params, page + 1) : null,
  };
}

/** Items and related shops for a results page. Empty lists if the database is unreachable. */
export async function getResults(
  items: ItemSearchArgs,
  shops: RelatedShopArgs,
  styleNames: [string, string][],
): Promise<{ items: ResultItem[]; shops: ResultShop[]; hasMore: boolean }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", "shops");
  const supabase = createPublicClient();
  const [itemRes, shopRes] = await Promise.all([
    supabase.rpc("search_products", items),
    supabase.rpc("search_related_shops", shops),
  ]);
  const itemRows = (itemRes.error ? null : (itemRes.data as ItemRow[] | null)) ?? [];
  const shopRows = (shopRes.error ? null : (shopRes.data as ShopRow[] | null)) ?? [];
  const { url } = supabaseEnv();
  const names = new Map(styleNames);
  return {
    items: itemRows.slice(0, PAGE_SIZE).map((row) => toResultItem(row, url)),
    shops: shopRows.map((row) => toResultShop(row, names)),
    hasMore: itemRows.length > PAGE_SIZE,
  };
}
