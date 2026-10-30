import Link from "next/link";
import type { HomeShop } from "@/components/home-view";
import { ProvinceSelect } from "@/components/province-select";
import { ItemCard, type ResultItem } from "@/components/results-view";
import { ShopDiscRow } from "@/components/shop-disc";
import { morphClaimer } from "@/lib/motion";

export type DiscoverData = {
  trending: (ResultItem & { views: number })[];
  dropped: ResultItem[];
  near: ResultItem[];
  cheap: ResultItem[];
  shops: HomeShop[];
  province: string | null;
};

const seeAll = "wide py-2 text-xs hover:text-magenta-strong";
/** Cards of the first row that fit on a wide screen; their photos load straight away. */
const ROW_IN_VIEW = 5;

function Row({
  title,
  hint,
  href,
  extra,
  children,
}: {
  title: string;
  hint: string;
  href?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="mt-12 md:mt-16">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b-2 border-print pb-2.5">
        <div className="flex flex-col">
          <h2 className="cond text-[44px] leading-[0.9] md:text-[60px]">{title}</h2>
          <span className="mt-1 text-[13px] text-muted">{hint}</span>
        </div>
        <div className="flex items-center gap-3">
          {extra}
          {href && (
            <Link href={href} className={seeAll}>
              SEE ALL
            </Link>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Items({
  items,
  badge,
  claim,
  priority = false,
}: {
  items: ResultItem[];
  badge?: (item: ResultItem) => string;
  claim: (id: string) => boolean;
  /** The first row on the page: its first cards load straight away. */
  priority?: boolean;
}) {
  return (
    <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-10 md:scroll-px-10 md:gap-5 md:px-10">
      {items.map((item, i) => (
        <li key={item.id} className="w-[150px] shrink-0 snap-start md:w-[230px]">
          <ItemCard item={item} badge={badge?.(item)} morph={claim(item.id)} priority={priority && i < ROW_IN_VIEW} />
        </li>
      ))}
    </ul>
  );
}

export function DiscoverView({ data }: { data: DiscoverData }) {
  const { trending, dropped, near, cheap, shops, province } = data;
  const views = new Map(trending.map((t) => [t.id, t.views]));
  // The same item can sit in several rows; only its first card morphs into the item page.
  const claim = morphClaimer();
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pt-5 pb-24 md:px-10 md:pt-10">
      <h1 className="cond text-[min(26vw,200px)] leading-[0.8] tracking-[-0.02em] text-magenta md:text-[176px]">DISCOVER</h1>
      <p className="mt-3 border-t-2 border-print pt-2 text-sm font-semibold md:text-base">
        ของใหม่และของที่คนดูเยอะจากทุกร้าน อัปเดตทุกวัน
      </p>

      {trending.length > 0 && (
        <Row title="TRENDING" hint="คนกดดูเยอะสุดใน 7 วันนี้">
          <Items items={trending} badge={(item) => `${views.get(item.id)} VIEWS`} claim={claim} priority />
        </Row>
      )}

      <Row title="JUST DROPPED" hint="เพิ่งลงขายล่าสุด" href="/search">
        {dropped.length > 0 ? <Items items={dropped} claim={claim} priority={trending.length === 0} /> : <p className="py-6 text-muted">ยังไม่มีของใหม่</p>}
      </Row>

      <Row
        title="NEAR YOU"
        hint="ร้านในจังหวัดที่เลือก"
        href={province ? `/search?province=${encodeURIComponent(province)}` : undefined}
        extra={<ProvinceSelect action="/discover" value={province} />}
      >
        {!province ? (
          <p className="py-6 text-muted">เลือกจังหวัดเพื่อดูของจากร้านใกล้คุณ</p>
        ) : near.length > 0 ? (
          <Items items={near} claim={claim} />
        ) : (
          <p className="py-6 text-muted">ยังไม่มีของในจังหวัดนี้ ลองจังหวัดใกล้เคียง</p>
        )}
      </Row>

      <Row title="UNDER ฿500" hint="ราคาเบา ไม่ต้องคิดเยอะ" href="/search?max=500">
        {cheap.length > 0 ? <Items items={cheap} claim={claim} /> : <p className="py-6 text-muted">ยังไม่มีของราคานี้</p>}
      </Row>

      <Row title="NEW SHOPS" hint="ร้านที่เพิ่งเปิด" href="/shops">
        {shops.length > 0 ? <ShopDiscRow shops={shops} /> : <p className="py-6 text-muted">ยังไม่มีร้านเปิด</p>}
      </Row>
    </div>
  );
}
