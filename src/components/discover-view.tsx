import Link from "next/link";
import type { HomeShop } from "@/components/home-view";
import { ProvinceSelect } from "@/components/province-select";
import { ItemCard, type ResultItem } from "@/components/results-view";
import { ShopDiscRow } from "@/components/shop-disc";

export type DiscoverData = {
  trending: (ResultItem & { views: number })[];
  dropped: ResultItem[];
  near: ResultItem[];
  cheap: ResultItem[];
  shops: HomeShop[];
  province: string | null;
};

const seeAll = "font-display text-[15px] tracking-button text-fg-soft hover:text-fg";

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
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pb-3">
        <div className="flex flex-col">
          <h2 className="font-display text-[26px] leading-tight font-normal tracking-[0.02em] md:text-[34px]">{title}</h2>
          <span className="text-[13px] text-muted">{hint}</span>
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

function Items({ items, badge }: { items: ResultItem[]; badge?: (item: ResultItem) => string }) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:-mx-10 md:gap-5 md:px-10">
      {items.map((item) => (
        <li key={item.id} className="w-[150px] shrink-0 snap-start md:w-[230px]">
          <ItemCard item={item} badge={badge?.(item)} />
        </li>
      ))}
    </ul>
  );
}

export function DiscoverView({ data }: { data: DiscoverData }) {
  const { trending, dropped, near, cheap, shops, province } = data;
  const views = new Map(trending.map((t) => [t.id, t.views]));
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pt-5 pb-24 md:px-10 md:pt-10">
      <h1 className="chrome-text font-display text-[64px] leading-[0.95] font-normal md:text-[128px]">DISCOVER</h1>
      <p className="mt-2 text-sm text-[#b4b9bf] md:text-base">ของใหม่และของที่คนดูเยอะจากทุกร้าน อัปเดตทุกวัน</p>

      {trending.length > 0 && (
        <Row title="TRENDING" hint="คนกดดูเยอะสุดใน 7 วันนี้">
          <Items items={trending} badge={(item) => `${views.get(item.id)} VIEWS`} />
        </Row>
      )}

      <Row title="JUST DROPPED" hint="เพิ่งลงขายล่าสุด" href="/search">
        {dropped.length > 0 ? <Items items={dropped} /> : <p className="py-6 text-muted">ยังไม่มีของใหม่</p>}
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
          <Items items={near} />
        ) : (
          <p className="py-6 text-muted">ยังไม่มีของในจังหวัดนี้ ลองจังหวัดใกล้เคียง</p>
        )}
      </Row>

      <Row title="UNDER ฿500" hint="ราคาเบา ไม่ต้องคิดเยอะ" href="/search?max=500">
        {cheap.length > 0 ? <Items items={cheap} /> : <p className="py-6 text-muted">ยังไม่มีของราคานี้</p>}
      </Row>

      <Row title="NEW SHOPS" hint="ร้านที่เพิ่งเปิด" href="/shops">
        {shops.length > 0 ? <ShopDiscRow shops={shops} /> : <p className="py-6 text-muted">ยังไม่มีร้านเปิด</p>}
      </Row>
    </div>
  );
}
