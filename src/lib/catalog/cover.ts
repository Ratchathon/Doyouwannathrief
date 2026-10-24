import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { CHEAP_MAX_BAHT, type StyleStat } from "@/lib/catalog/cover-lines";

export { buildCoverLines, contentsCount, CHEAP_MAX_BAHT } from "@/lib/catalog/cover-lines";
export type { CoverLine, StyleStat } from "@/lib/catalog/cover-lines";

/** Live numbers for the cover. Empty if the database is unreachable. */
export async function getCover(): Promise<{ styles: StyleStat[]; cheap: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", "shops", "styles");
  const supabase = createPublicClient();
  const [styles, cheap] = await Promise.all([
    supabase.rpc("style_stats"),
    supabase.rpc("count_on_sale", { p_max_satang: CHEAP_MAX_BAHT * 100 }),
  ]);
  return {
    styles: styles.error ? [] : ((styles.data as StyleStat[] | null) ?? []),
    cheap: cheap.error ? 0 : ((cheap.data as number | null) ?? 0),
  };
}
