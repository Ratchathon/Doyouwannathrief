import Link from "next/link";
import { SortSelect } from "@/components/sort-select";
import type { ItemSort } from "@/lib/search/params";
import { formatBaht } from "@/lib/search/results";

export type ResultShop = {
  slug: string;
  display_name: string;
  province: string;
  style: string | null;
  match_count: number;
};

export type ResultItem = {
  id: string;
  title: string;
  brand: string | null;
  price_satang: number;
  size_label: string;
  status: "active" | "reserved" | string;
  shop_slug: string;
  shop_name: string;
  photo: string | null;
};

export type ResultsViewProps = {
  /** Optional search box shown above the title. */
  search?: React.ReactNode;
  title: string;
  description?: string;
  /** Page path the sort form submits to, e.g. /search or /styles/vintage. */
  path: string;
  /** Current query string (without the leading ?). */
  params: string;
  sort: ItemSort;
  shops: ResultShop[];
  items: ResultItem[];
  prevHref: string | null;
  nextHref: string | null;
};

const paneTitle = "font-display text-xl tracking-nav";

export function ResultsView(props: ResultsViewProps) {
  const { title, description, shops, items } = props;
  return (
    <div className="flex flex-col">
      {props.search && <div className="w-full max-w-[560px] px-4 pt-2 md:px-8">{props.search}</div>}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 pt-4 pb-4 md:px-8 md:pt-5">
        <h1 className="font-display text-[34px] leading-none font-normal tracking-[0.02em] break-words md:text-[44px]">
          {title}
        </h1>
        {description && <p className="text-[15px] text-muted">{description}</p>}
      </div>

      <div className="flex flex-col border-t border-line md:h-[calc(100dvh-88px)] md:min-h-[520px] md:flex-row">
        <section
          aria-label="SHOPS"
          className="border-b border-line md:w-[360px] md:shrink-0 md:overflow-y-auto md:border-r md:border-b-0 lg:w-[400px] [scrollbar-color:#3a3e44_transparent] [scrollbar-width:thin]"
        >
          <h2 id="pane-shops" className={`${paneTitle} bg-ink px-4 pt-4 pb-3 md:sticky md:top-0 md:z-10 md:px-6`}>
            SHOPS <span className="text-faint">· {shops.length}</span>
          </h2>
          {shops.length === 0 ? (
            <p className="px-4 pb-5 text-muted md:px-6">ไม่มีร้านที่ตรงกับคำค้นนี้</p>
          ) : (
            <ul className="flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:pb-0">
              {shops.map((shop) => (
                <li key={shop.slug} className="w-[72%] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none">
                  <Link
                    href={`/${shop.slug}`}
                    className="flex h-full flex-col gap-1.5 border border-line p-4 text-fg hover:bg-[#17191c] md:border-x-0 md:border-b-0 md:px-6 md:py-5"
                  >
                    <span className="font-display text-2xl leading-[1.05] tracking-[0.01em] md:text-[28px]">
                      {shop.display_name}
                    </span>
                    <span className="text-[15px] text-muted">{shop.province}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      {shop.match_count > 0 && (
                        <span className="chrome inline-flex h-7 items-center rounded-full px-3 font-label text-xs font-bold tracking-[0.06em]">
                          {shop.match_count} ชิ้น
                        </span>
                      )}
                      {shop.style && (
                        <span className="font-label text-xs font-semibold tracking-[0.12em] text-faint">{shop.style}</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-label="ITEMS"
          className="min-w-0 flex-1 md:overflow-y-auto [scrollbar-color:#3a3e44_transparent] [scrollbar-width:thin]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-ink px-4 py-3 md:sticky md:top-0 md:z-10 md:px-8">
            <h2 id="pane-items" className={paneTitle}>
              ITEMS{" "}
              <span className="text-faint">
                · {Math.min(items.length, 24)}
                {props.nextHref ? "+" : ""}
              </span>
            </h2>
            <SortForm {...props} />
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-16 text-center md:px-8">
              <p className="text-muted">ยังไม่มีของที่ตรงกับคำค้นนี้ ลองคำอื่น หรือเดินดูทั้งหมด</p>
              <Link href="/discover" className="btn-chrome mt-6">
                DISCOVER
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-7 px-4 pt-5 pb-8 sm:grid-cols-3 md:gap-x-5 md:px-8 md:pt-6 xl:grid-cols-4">
                {items.map((item) => (
                  <li key={item.id}>
                    <ItemCard item={item} />
                  </li>
                ))}
              </ul>
              <Pager prevHref={props.prevHref} nextHref={props.nextHref} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function ItemCard({ item, showShop = true }: { item: ResultItem; showShop?: boolean }) {
  return (
    <Link href={`/${item.shop_slug}/${item.id}`} className="group flex flex-col gap-2 text-fg">
      <span className="relative block aspect-[4/5] overflow-hidden border border-[#23262a] bg-gradient-to-b from-[#1a1c20] to-[#121316]">
        {item.photo ? (
          // Photos are already resized to WebP on upload, so they are served as-is.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photo}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition group-hover:brightness-110"
          />
        ) : (
          <svg
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-16 -translate-1/2 fill-none stroke-[#4a5058] stroke-2"
          >
            <path d="M22 8l-14 8 5 12 7-3v31h24V25l7 3 5-12-14-8c-2 4-6 6-10 6s-8-2-10-6z" />
          </svg>
        )}
        {item.status === "reserved" && (
          <span className="chrome absolute top-2.5 left-2.5 inline-flex h-6 items-center rounded-full px-2.5 font-label text-[11px] font-bold tracking-[0.1em]">
            RESERVED
          </span>
        )}
      </span>
      {item.brand && (
        <span className="font-label text-xs font-bold tracking-[0.12em] text-muted">{item.brand.toUpperCase()}</span>
      )}
      <span className="line-clamp-2 text-[15px] leading-snug">{item.title}</span>
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl tracking-[0.02em]">{formatBaht(item.price_satang)}</span>
        <span className="text-[13px] text-faint">SIZE {item.size_label}</span>
      </span>
      {showShop && <span className="text-[13px] text-faint">{item.shop_name}</span>}
    </Link>
  );
}

function SortForm({ path, params, sort }: Pick<ResultsViewProps, "path" | "params" | "sort">) {
  const keep = [...new URLSearchParams(params)].filter(([key]) => key !== "sort" && key !== "page");
  return (
    <form action={path} className="flex items-center gap-2">
      {keep.map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <SortSelect defaultValue={sort} />
    </form>
  );
}

function Pager({ prevHref, nextHref }: { prevHref: string | null; nextHref: string | null }) {
  if (!prevHref && !nextHref) return null;
  const link = "inline-flex h-11 items-center rounded-full border border-[#3a3e44] px-5 font-display tracking-button hover:border-muted";
  return (
    <nav aria-label="Pages" className="flex justify-center gap-3 px-4 pb-12">
      {prevHref && (
        <Link href={prevHref} className={link}>
          PREVIOUS
        </Link>
      )}
      {nextHref && (
        <Link href={nextHref} className={link}>
          NEXT
        </Link>
      )}
    </nav>
  );
}
