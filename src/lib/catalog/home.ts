import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { HomeShop } from "@/components/home-view";
import { createPublicClient } from "@/lib/supabase/public";

const HOME_SHOP_LIMIT = 6;

type StyleRef = { name_en: string; position: number } | null;
export type ShopRow = {
  slug: string;
  display_name: string;
  province: string;
  shop_styles: { styles: StyleRef }[] | null;
};

export function toHomeShop(row: ShopRow): HomeShop {
  const first = (row.shop_styles ?? [])
    .map((s) => s.styles)
    .filter((s): s is NonNullable<StyleRef> => s !== null)
    .sort((a, b) => a.position - b.position)[0];
  return { slug: row.slug, display_name: row.display_name, province: row.province, style: first?.name_en ?? null };
}

/** Newest approved shops for the homepage. Empty if the database is unreachable. */
export async function getHomeShops(): Promise<HomeShop[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shops");
  const { data, error } = await createPublicClient()
    .from("shops")
    .select("slug, display_name, province, shop_styles(styles(name_en, position))")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(HOME_SHOP_LIMIT);
  if (error || !data) return [];
  return (data as unknown as ShopRow[]).map(toHomeShop);
}
