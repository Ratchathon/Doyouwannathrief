import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DiscoverData } from "@/components/discover-view";
import { getHomeShops } from "@/lib/catalog/home";
import { toResultItem } from "@/lib/catalog/results";
import { supabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

const ROW = 12;
const CHEAP_SATANG = 50_000;

type Row = Parameters<typeof toResultItem>[0];

/** Everything on the Discover page. Rows that fail to load come back empty. */
export async function getDiscover(province: string | null): Promise<DiscoverData> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", "shops");
  const supabase = createPublicClient();
  const newest = { p_sort: "newest", p_limit: ROW };
  const [trending, dropped, near, cheap, shops] = await Promise.all([
    supabase.rpc("trending_products", { p_days: 7, p_min_views: 3, p_limit: ROW }),
    supabase.rpc("search_products", newest),
    province ? supabase.rpc("search_products", { ...newest, p_province: province }) : Promise.resolve({ data: [], error: null }),
    supabase.rpc("search_products", { ...newest, p_max_satang: CHEAP_SATANG }),
    getHomeShops(),
  ]);
  const { url } = supabaseEnv();
  const rows = (res: { data: unknown; error: unknown }) => ((res.error ? null : (res.data as Row[] | null)) ?? []);
  return {
    trending: (rows(trending) as (Row & { views: number })[]).map((r) => ({ ...toResultItem(r, url), views: r.views })),
    dropped: rows(dropped).map((r) => toResultItem(r, url)),
    near: rows(near).map((r) => toResultItem(r, url)),
    cheap: rows(cheap).map((r) => toResultItem(r, url)),
    shops,
    province,
  };
}
