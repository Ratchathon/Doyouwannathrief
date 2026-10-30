import Link from "next/link";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/icons";
import { FIRST_ROW, ItemCard } from "@/components/results-view";
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

const chip = "wide inline-flex h-10 shrink-0 items-center border-2 border-print px-3 text-[11px] whitespace-nowrap";
const chipOn = "bg-print text-white";
const chipOff = "bg-sheet hover:bg-highlight";

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
      <section className="mx-auto flex w-full max-w-[1360px] flex-wrap items-end justify-between gap-8 px-4 pt-7 pb-10 md:px-10 md:pt-12 md:pb-12">
        <div className="min-w-0 flex-[999_1_560px]">
          <h1 className="cond text-[clamp(56px,8.4vw,116px)] leading-[0.88] break-words">{shop.name}</h1>
          <p className="wide mt-3 border-t-2 border-print pt-2 text-xs">
            {shop.styles[0]?.en ? `${shop.styles[0].en.toUpperCase()} · ` : ""}
            {shop.province}
          </p>
          {shop.bio && <p className="mt-4 max-w-[620px] text-print-soft">{shop.bio}</p>}
          {shop.styles.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {shop.styles.map((s) => (
                <Link
                  key={s.slug}
                  href={`/styles/${s.slug}`}
                  className="wide inline-flex h-9 items-center border-2 border-print bg-sheet px-3 text-[11px] hover:bg-highlight"
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
              <span className="cond tabular text-[56px] leading-[0.9] text-magenta">{forSale}</span>
              <span className="label-wide">FOR SALE</span>
            </p>
            <p className="flex flex-col">
              <span className="cond tabular text-[56px] leading-[0.9]">{sold}</span>
              <span className="label-wide">SOLD</span>
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
                    className="inline-flex size-11 items-center justify-center border-2 border-print bg-sheet hover:bg-highlight"
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          )}
          <Link href={`/report?shop=${shop.slug}`} className="text-sm text-muted underline underline-offset-4 hover:text-print">
            แจ้งปัญหาร้านนี้
          </Link>
        </div>
      </section>

      <section aria-label="สินค้าของร้าน" className="mx-auto w-full max-w-[1360px] px-4 pb-24 md:px-10">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-y-2 border-print bg-paper py-3">
          <nav aria-label="หมวดสินค้าในร้าน" className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1">
            <Link
              href={categoryHref(shop.slug, params, null)}
              aria-current={category === null ? "page" : undefined}
              className={`${chip} ${category === null ? chipOn : chipOff}`}
            >
              ALL · {forSale}
            </Link>
            {categories.map((c) => (
              <Link
                key={c.value}
                href={categoryHref(shop.slug, params, c.value)}
                aria-current={category === c.value ? "page" : undefined}
                className={`${chip} ${category === c.value ? chipOn : chipOff}`}
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
            {items.map((item, i) => (
              <li key={item.id}>
                <ItemCard item={item} showShop={false} priority={i < FIRST_ROW} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
