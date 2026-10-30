import Link from "next/link";
import { ViewTransition } from "react";
import { SortSelect } from "@/components/sort-select";
import type { ItemSort } from "@/lib/search/params";
import { photoMorphName } from "@/lib/motion";
import { formatBaht } from "@/lib/search/results";

/** Cards in the first row of a grid load their photo straight away (4 columns at the widest). */
export const FIRST_ROW = 4;

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
  /** Optional filter controls shown in the items toolbar. */
  filters?: React.ReactNode;
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

const paneTitle = "cond text-[30px] leading-none";

export function ResultsView(props: ResultsViewProps) {
  const { title, description, shops, items } = props;
  return (
    <div className="flex flex-col">
      {props.search && <div className="w-full max-w-[600px] px-4 pt-4 md:px-8">{props.search}</div>}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 px-4 pt-5 pb-4 md:px-8 md:pt-6">
        <h1 className="cond text-[56px] leading-[0.88] break-words md:text-[80px]">
          {title}
        </h1>
        {description && <p className="text-[15px] font-semibold md:text-base">{description}</p>}
      </div>

      <div className="flex flex-col border-t-2 border-print md:h-[calc(100dvh-64px)] md:min-h-[520px] md:flex-row">
        <section
          aria-label="SHOPS"
          className="border-b-2 border-print md:w-[360px] md:shrink-0 md:overflow-y-auto md:border-r-2 md:border-b-0 lg:w-[400px] [scrollbar-color:#111111_transparent] [scrollbar-width:thin]"
        >
          <h2 id="pane-shops" className={`${paneTitle} bg-paper px-4 pt-4 pb-3 md:sticky md:top-0 md:z-10 md:px-6`}>
            SHOPS <span className="text-magenta">{shops.length}</span>
          </h2>
          {shops.length === 0 ? (
            <p className="px-4 pb-5 text-muted md:px-6">ไม่มีร้านที่ตรงกับคำค้นนี้</p>
          ) : (
            <ul className="flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:pb-0">
              {shops.map((shop) => (
                <li key={shop.slug} className="w-[72%] max-w-[300px] shrink-0 snap-start md:w-auto md:max-w-none">
                  <Link
                    href={`/${shop.slug}`}
                    className="flex h-full flex-col gap-1 border-2 border-print bg-sheet p-4 hover:bg-highlight md:border-x-0 md:border-t-0 md:border-b md:bg-transparent md:px-6 md:py-5"
                  >
                    <span className="wide text-[17px] leading-tight md:text-[19px]">{shop.display_name}</span>
                    <span className="text-[15px] text-muted">{shop.province}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      {shop.match_count > 0 && (
                        <span className="wide inline-flex h-6 items-center bg-highlight px-2 text-[11px]">{shop.match_count} ชิ้น</span>
                      )}
                      {shop.style && <span className="wide text-[11px] tracking-[0.08em] text-muted">{shop.style.toUpperCase()}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-label="ITEMS"
          className="min-w-0 flex-1 md:overflow-y-auto [scrollbar-color:#111111_transparent] [scrollbar-width:thin]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-print bg-paper px-4 py-3 md:sticky md:top-0 md:z-10 md:px-8">
            <h2 id="pane-items" className={paneTitle}>
              ITEMS{" "}
              <span className="text-magenta">
                {Math.min(items.length, 24)}
                {props.nextHref ? "+" : ""}
              </span>
            </h2>
            {props.filters}
            <SortForm {...props} />
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-16 text-center md:px-8">
              <p className="text-muted">ยังไม่มีของที่ตรงกับคำค้นนี้ ลองคำอื่น หรือเดินดูทั้งหมด</p>
              <Link href="/discover" className="btn mt-6">
                DISCOVER
              </Link>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-8 px-4 pt-5 pb-10 sm:grid-cols-3 md:gap-x-5 md:px-8 md:pt-6 xl:grid-cols-4">
                {items.map((item, i) => (
                  <li key={item.id}>
                    <ItemCard item={item} priority={i < FIRST_ROW} />
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

export function ItemCard({
  item,
  showShop = true,
  badge,
  priority = false,
  morph = true,
}: {
  item: ResultItem;
  showShop?: boolean;
  /** Short label on the photo, e.g. a view count. */
  badge?: string;
  /** Load the photo straight away (cards in the first row). */
  priority?: boolean;
  /** Morph the photo into the item page's photo. Off when the item already has a card higher up the page. */
  morph?: boolean;
}) {
  const photo = (
    <span className="relative block aspect-[4/5] overflow-hidden bg-photo transition-transform duration-150 ease-out group-active:scale-[0.97]">
      {item.photo ? (
        // Photos are already resized to WebP on upload, so they are served as-is.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.photo}
          alt={item.title}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-16 -translate-1/2 fill-none stroke-[#9a9a96] stroke-2"
        >
          <path d="M22 8l-14 8 5 12 7-3v31h24V25l7 3 5-12-14-8c-2 4-6 6-10 6s-8-2-10-6z" />
        </svg>
      )}
      {badge && item.status !== "reserved" && (
        <span className="wide absolute top-2 left-2 bg-highlight px-1.5 py-0.5 text-[10px]">{badge}</span>
      )}
      {item.status === "reserved" && (
        <span className="wide absolute top-2 left-2 bg-print px-1.5 py-0.5 text-[10px] text-white">RESERVED</span>
      )}
    </span>
  );
  return (
    <Link href={`/${item.shop_slug}/${item.id}`} className="group flex flex-col text-print">
      {morph ? (
        <ViewTransition name={photoMorphName(item.id)} share="morph" default="none">
          {photo}
        </ViewTransition>
      ) : (
        photo
      )}
      <span className="mt-2 flex items-baseline justify-between gap-2 border-t-2 border-print pt-1.5">
        <span className="cond text-[26px] leading-none group-hover:text-magenta-strong">{formatBaht(item.price_satang)}</span>
        <span className="wide text-[11px]">SIZE {item.size_label}</span>
      </span>
      {item.brand && <span className="wide mt-1 text-[10.5px] tracking-[0.06em]">{item.brand.toUpperCase()}</span>}
      <span className="mt-0.5 line-clamp-2 text-[14px] leading-snug">{item.title}</span>
      {showShop && <span className="mt-0.5 text-[12px] text-muted">{item.shop_name}</span>}
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
  const link = "btn-outline";
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
