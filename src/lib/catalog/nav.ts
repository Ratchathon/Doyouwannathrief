import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { NavShop, NavStyle } from "@/components/site-header";
import { createPublicClient } from "@/lib/supabase/public";

const NAV_SHOP_LIMIT = 8;

/** Styles and newest shops for the header menus. Empty lists if the database is unreachable. */
export async function getNavData(): Promise<{ styles: NavStyle[]; shops: NavShop[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("styles", "shops");
  const supabase = createPublicClient();
  const [styles, shops] = await Promise.all([
    supabase.from("styles").select("slug, name_en").order("position"),
    supabase
      .from("shops")
      .select("slug, display_name, province")
      .eq("status", "approved")
      .order("approved_at", { ascending: false })
      .limit(NAV_SHOP_LIMIT),
  ]);
  return {
    styles: (styles.error ? null : (styles.data as NavStyle[] | null)) ?? [],
    shops: (shops.error ? null : (shops.data as NavShop[] | null)) ?? [],
  };
}
