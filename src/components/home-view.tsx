import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import type { NavStyle } from "@/components/site-header";

export type HomeShop = { slug: string; display_name: string; province: string; style: string | null };

// Uneven pillar heights give the style row its skyline; repeats if there are more styles.
const PILLAR_HEIGHTS = [300, 380, 250, 340, 280, 360];

export function HomeView({ styles, shops }: { styles: NavStyle[]; shops: HomeShop[] }) {
  return (
    <>
      <section className="px-4 pt-14 pb-8 text-center md:px-10 md:pt-20 md:pb-10">
        <p className="label-caps tracking-[0.26em]">CURATED SECONDHAND · ALL OVER THAILAND</p>
        <h1 className="mt-6 font-display leading-none font-normal md:mt-7">
          <span className="block text-[clamp(26px,4.2vw,64px)] tracking-[0.14em] text-muted">DO YOU WANNA</span>{" "}
          <span className="chrome-text mt-1.5 block text-[clamp(84px,14vw,216px)] leading-none tracking-[0.02em]">
            THRIFT?
          </span>
        </h1>
        <p className="mt-9 font-display text-[clamp(17px,1.8vw,24px)] tracking-[0.1em] md:mt-11">
          CURATED SECONDHAND SHOPS FROM ALL OVER THAILAND
        </p>
        <p className="mx-auto mt-3 max-w-[600px] text-balance text-[#b4b9bf]">
          ร้านมือสองที่คัดสไตล์แล้วจากทั่วประเทศ ทุกชิ้นมีชิ้นเดียว เลือกจากร้าน ไม่ต้องคุ้ยกอง
        </p>
      </section>

      <nav aria-label="Shop by style" className="px-4 pt-10 pb-14 md:px-10 md:pt-12 md:pb-18">
        {/* Phone: numbered tiles in two columns. Desktop: a skyline of chrome pillars. */}
        <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] md:items-end md:gap-5">
          {styles.map((style, i) => (
            <li key={style.slug}>
              <Link
                href={`/styles/${style.slug}`}
                className="group flex h-[150px] flex-col justify-between border border-line bg-[linear-gradient(160deg,#17191c_0%,#0e0f11_100%)] p-3.5 text-fg active:bg-[#17191c] md:h-auto md:justify-start md:gap-3.5 md:border-0 md:bg-none md:p-0"
                style={{ "--h": `${PILLAR_HEIGHTS[i % PILLAR_HEIGHTS.length]}px` } as React.CSSProperties}
              >
                <span className="font-label text-[11px] font-bold tracking-[0.16em] text-faint md:hidden">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span aria-hidden="true" className="slab hidden group-hover:-translate-y-1.5 md:block md:h-(--h)" />
                <span className="flex flex-col md:items-center">
                  <span
                    className={`font-display leading-none tracking-[0.01em] md:text-center md:text-xl md:leading-tight md:tracking-[0.04em] ${
                      style.name_en.length > 10 ? "text-xl" : "text-[30px]"
                    }`}
                  >
                    {style.name_en.toUpperCase()}
                  </span>
                  {style.name_th && style.name_th.toLowerCase() !== style.name_en.toLowerCase() && <span className="mt-1 text-xs text-muted md:hidden">{style.name_th}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto mt-2 w-full max-w-[680px] px-4 md:mt-6 md:px-10">
        <SearchBox />
      </div>

      <section aria-labelledby="new-shops" className="mx-auto w-full max-w-[1360px] px-4 pt-24 pb-8 md:px-10 md:pt-32">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-4">
          <h2 id="new-shops" className="font-display text-[28px] font-normal tracking-[0.02em] md:text-[34px]">
            NEW SHOPS
          </h2>
          <Link href="/discover/shops" className="font-display text-[17px] tracking-button text-fg-soft hover:text-fg">
            SEE ALL
          </Link>
        </div>
        {shops.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted">ยังไม่มีร้านเปิด ร้านแรกกำลังมา</p>
            <Link href="/sell/apply" className="btn-chrome mt-6">
              OPEN YOUR SHOP
            </Link>
          </div>
        ) : (
          <ul className="grid gap-x-16 md:grid-cols-2">
            {shops.map((shop) => (
              <li key={shop.slug}>
                <Link
                  href={`/${shop.slug}`}
                  className="flex items-center justify-between gap-6 border-b border-line py-6 text-fg hover:text-white md:py-7"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-[30px] leading-[1.05] tracking-[0.01em] break-words md:text-[40px]">
                      {shop.display_name}
                    </span>
                    <span className="text-[15px] text-muted">{shop.province}</span>
                  </span>
                  {shop.style && (
                    <span className="shrink-0 font-label text-xs font-semibold tracking-[0.12em] text-faint">
                      {shop.style.toUpperCase()}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="px-4 py-24 text-center md:px-10 md:py-28">
        <p className="mx-auto max-w-[900px] font-display text-[clamp(28px,4vw,56px)] leading-[1.08] tracking-[0.01em]">
          EVERY PIECE SHOWN FRONT, BACK, LABEL AND FLAWS. PAID FOR ONLY WHEN IT ARRIVES.
        </p>
        <p className="mx-auto mt-4 max-w-[520px] text-muted">
          ทุกชิ้นมีรูปหน้า หลัง ป้ายแบรนด์ และตำหนิ เงินถึงร้านเมื่อคุณยืนยันว่าได้ของแล้ว
        </p>
        <Link href="/how-it-works" className="btn-chrome mt-8">
          HOW IT WORKS
        </Link>
      </section>
    </>
  );
}
