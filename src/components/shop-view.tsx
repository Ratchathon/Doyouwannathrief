import Link from "next/link";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/icons";
import { ItemCard } from "@/components/results-view";
import { SortSelect } from "@/components/sort-select";
import type { ShopPage } from "@/lib/catalog/shop";
import type { Category } from "@/lib/products/listing";
import type { ItemSort } from "@/lib/search/params";

const ICONS = { Instagram: InstagramIcon, TikTok: TikTokIcon, Facebook: FacebookIcon };

function categoryHref(slug: string, params: string, category: Category | null): string {
  const next = new URLSearchParams(params);
  next.delete("category");
  next.delete("page");
  if (category) next.set("category", category);
  const query = next.toString();
  return query ? `/${slug}?${query}` : `/${slug}`;
}

const chip =
  "inline-flex h-10 shrink-0 items-center rounded-full px-4 font-label text-[13px] font-semibold tracking-[0.06em] whitespace-nowrap";

export function ShopView({
  page,
  category,
  sort,
  params,
}: {
  page: ShopPage;
  category: Category | null;
  sort: ItemSort;
  params: string;
}) {
  const { shop, items, categories, forSale, sold } = page;
  const keep = [...new URLSearchParams(params)].filter(([k]) => k !== "sort" && k !== "page");

  return (
    <div className="flex flex-col">
      <section className="mx-auto flex w-full max-w-[1360px] flex-wrap items-end justify-between gap-8 px-4 pt-8 pb-10 md:px-10 md:pt-14 md:pb-12">
        <div className="min-w-0 flex-[999_1_560px]">
          <p className="label-caps tracking-[0.26em]">
            {shop.styles[0]?.en ? `${shop.styles[0].en} · ` : ""}
            {shop.province}
          </p>
          <h1 className="chrome-text mt-3.5 font-display text-[clamp(48px,8vw,120px)] leading-[0.95] font-normal tracking-[0.01em] break-words">
            {shop.name}
          </h1>
          {shop.bio && <p className="mt-5 max-w-[620px] text-[#b4b9bf]">{shop.bio}</p>}
          {shop.styles.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {shop.styles.map((s) => (
                <Link
                  key={s.slug}
                  href={`/styles/${s.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-[#3a3e44] px-3.5 font-label text-xs font-semibold tracking-[0.12em] hover:border-muted"
                >
                  {s.en}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-[1_1_260px] flex-col items-start gap-4">
          <div className="flex gap-8">
            <p className="flex flex-col">
              <span className="font-display text-[40px] leading-none">{forSale}</span>
              <span className="label-caps">FOR SALE</span>
            </p>
            <p className="flex flex-col">
              <span className="font-display text-[40px] leading-none">{sold}</span>
              <span className="label-caps">SOLD</span>
            </p>
          </div>
          {shop.social.length > 0 && (
            <div className="flex gap-2">
              {shop.social.map(({ url, platform }) => {
                const Icon = ICONS[platform];
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${platform} ของร้าน`}
                    className="chrome inline-flex size-11 items-center justify-center rounded-full"
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          )}
          <Link href={`/report?shop=${shop.slug}`} className="text-sm text-faint underline underline-offset-4 hover:text-fg-soft">
            แจ้งปัญหาร้านนี้
          </Link>
        </div>
      </section>

      <section aria-label="สินค้าของร้าน" className="mx-auto w-full max-w-[1360px] px-4 pb-24 md:px-10">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-y border-line bg-ink py-3">
          <nav aria-label="หมวดสินค้าในร้าน" className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1">
            <Link
              href={categoryHref(shop.slug, params, null)}
              aria-current={category === null ? "page" : undefined}
              className={`${chip} ${category === null ? "chrome" : "border border-[#3a3e44] hover:border-muted"}`}
            >
              ALL · {forSale}
            </Link>
            {categories.map((c) => (
              <Link
                key={c.value}
                href={categoryHref(shop.slug, params, c.value)}
                aria-current={category === c.value ? "page" : undefined}
                className={`${chip} ${category === c.value ? "chrome" : "border border-[#3a3e44] hover:border-muted"}`}
              >
                {c.en} · {c.n}
              </Link>
            ))}
          </nav>
          <form action={`/${shop.slug}`} className="flex items-center">
            {keep.map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <SortSelect defaultValue={sort} />
          </form>
        </div>

        {items.length === 0 ? (
          <p className="py-16 text-center text-muted">
            {category ? "ยังไม่มีของในหมวดนี้ ลองดูหมวดอื่นของร้าน" : "ร้านนี้ยังไม่มีของวางขายตอนนี้"}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-8 pt-7 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} showShop={false} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
