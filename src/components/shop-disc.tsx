import Link from "next/link";

export type DiscShop = { slug: string; display_name: string; province: string; isNew?: boolean };

/** Two letters from a shop's name for its round badge, until shops can upload a logo. */
export function monogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    const chars = [...words[0]];
    // Thai letters stack with vowels and tone marks, so one leading letter reads better.
    return /^[฀-๿]/.test(chars[0]) ? chars[0] : chars.slice(0, 2).join("").toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Horizontal slider of round chrome badges with the shop name underneath. */
export function ShopDiscRow({
  shops,
  size = "md",
  layout = "row",
}: {
  shops: DiscShop[];
  size?: "md" | "lg";
  layout?: "row" | "grid";
}) {
  const disc = size === "lg" ? "size-[92px] md:size-32 text-[31px] md:text-[44px]" : "size-[92px] text-[31px]";
  const width = layout === "grid" ? "" : size === "lg" ? "w-[108px] md:w-[148px]" : "w-[108px]";
  const list =
    layout === "grid"
      ? "grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 md:grid-cols-6"
      : "-mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-10 md:gap-7 md:px-10";
  return (
    <ul className={list}>
      {shops.map((shop) => (
        <li key={shop.slug} className={`${width} shrink-0 snap-start`}>
          <Link href={`/${shop.slug}`} className="group flex flex-col items-center gap-2.5 text-center text-fg">
            <span className="relative">
              <span
                aria-hidden="true"
                className={`chrome flex items-center justify-center rounded-full font-display tracking-[0.02em] transition-transform group-hover:-translate-y-1 ${disc}`}
              >
                {monogram(shop.display_name)}
              </span>
              {shop.isNew && (
                <span className="chrome absolute -top-0.5 -right-1 inline-flex h-5 items-center rounded-full px-1.5 font-label text-[9px] font-bold tracking-[0.12em]">
                  NEW
                </span>
              )}
            </span>
            <span className="flex flex-col items-center">
              <span className="font-display text-[15px] leading-[1.1] md:text-lg">{shop.display_name}</span>
              <span className="mt-0.5 text-xs text-muted">{shop.province}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
