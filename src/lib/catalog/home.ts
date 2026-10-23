import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { HomeShop } from "@/components/home-view";
import { createPublicClient } from "@/lib/supabase/public";

const HOME_SHOP_LIMIT = 12;

type StyleRef = { name_en: string; position: number } | null;
export type ShopRow = {
  slug: string;
  display_name: string;
  province: string;
  approved_at?: string | null;
  shop_styles: { styles: StyleRef }[] | null;
};

const NEW_FOR_DAYS = 14;

export function toHomeShop(row: ShopRow): HomeShop {
  const first = (row.shop_styles ?? [])
    .map((s) => s.styles)
    .filter((s): s is NonNullable<StyleRef> => s !== null)
    .sort((a, b) => a.position - b.position)[0];
  const isNew = row.approved_at ? Date.now() - Date.parse(row.approved_at) < NEW_FOR_DAYS * 86_400_000 : false;
  return { slug: row.slug, display_name: row.display_name, province: row.province, style: first?.name_en ?? null, isNew };
}

/** Newest approved shops for the homepage. Empty if the database is unreachable. */
export async function getHomeShops(): Promise<HomeShop[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shops");
  const { data, error } = await createPublicClient()
    .from("shops")
    .select("slug, display_name, province, approved_at, shop_styles(styles(name_en, position))")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(HOME_SHOP_LIMIT);
  if (error || !data) return [];
  return (data as unknown as ShopRow[]).map(toHomeShop);
}

/** Every approved shop, for the shops directory. */
export async function getAllShops(province: string | null): Promise<HomeShop[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shops");
  let query = createPublicClient()
    .from("shops")
    .select("slug, display_name, province, approved_at, shop_styles(styles(name_en, position))")
    .eq("status", "approved");
  if (province) query = query.eq("province", province);
  const { data, error } = await query.order("display_name").limit(500);
  if (error || !data) return [];
  return (data as unknown as ShopRow[]).map(toHomeShop);
}
