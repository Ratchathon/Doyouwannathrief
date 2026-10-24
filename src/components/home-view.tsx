import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { ShopDiscRow } from "@/components/shop-disc";
import { contentsCount, type CoverLine, type StyleStat } from "@/lib/catalog/cover-lines";

export type HomeShop = { slug: string; display_name: string; province: string; style: string | null; isNew?: boolean };

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-1 ${className}`}
    >
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const TITLE: Record<CoverLine["tone"], string> = {
  lead: "cond text-[76px] leading-[0.88] text-balance md:text-[96px]",
  magenta: "wide text-[26px] leading-none text-magenta md:text-[38px]",
  marker: "cond text-[46px] leading-[0.95] md:text-[58px]",
  plain: "wide text-[22px] leading-[1.05] md:text-[28px]",
};

function CoverLink({ line }: { line: CoverLine }) {
  const lead = line.tone === "lead";
  return (
    <Link
      href={line.href}
      className={`group flex border-b border-print hover:text-magenta-strong ${
        lead ? "flex-col pb-5 md:col-span-2" : "items-center justify-between gap-3 py-4"
      }`}
    >
      <span className="flex min-w-0 flex-col">
        <span className={TITLE[line.tone]}>
          {line.tone === "marker" ? <span className="marker marker-sweep">{line.title}</span> : line.title}
        </span>
        {!lead && <span className="mt-1.5 text-[15px] font-semibold text-print md:text-base">{line.sub}</span>}
      </span>
      {lead ? (
        <span className="mt-2 flex items-center justify-between gap-3 text-[17px] font-semibold text-print md:text-xl">
          {line.sub}
          <Arrow />
        </span>
      ) : (
        <Arrow />
      )}
    </Link>
  );
}

export function HomeView({ styles, lines, shops }: { styles: StyleStat[]; lines: CoverLine[]; shops: HomeShop[] }) {
  return (
    <>
      <section className="mx-auto w-full max-w-[1360px] px-4 pt-1 md:px-10 md:pt-3">
        <h1 className="cond overflow-hidden text-[min(32vw,190px)] leading-[0.8] tracking-[-0.02em] text-magenta md:text-[min(12vw,172px)] md:whitespace-nowrap">
          <span className="block md:inline">DOYOU</span>
          <span className="block md:inline">WANNA</span>
          <span className="block md:inline">THRIFT</span>
        </h1>

        <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-2 border-b border-print py-2">
          <p className="wide text-[11px] tracking-[0.1em]">CURATED SECONDHAND FROM ALL OVER THAILAND</p>
          <p className="text-[13px] font-semibold md:text-sm">มือสองที่คัดแล้ว จากทั่วไทย · ทุกชิ้นมีชิ้นเดียว</p>
        </div>

        <div className="mt-5 flex flex-col gap-12 md:mt-9 md:grid md:grid-cols-12 md:grid-rows-[auto_1fr] md:items-start md:gap-x-12 md:gap-y-9">
          <div className="md:col-span-5 md:col-start-8 md:row-start-1">
            <SearchBox />
          </div>

          <nav aria-label="Cover lines" className="-mt-5 md:col-span-7 md:col-start-1 md:row-span-2 md:row-start-1 md:mt-0">
            {lines.length === 0 ? (
              <div className="border-b border-print pb-5">
                <p className="cond text-[64px] leading-[0.9] md:text-[96px]">SHOPS ARE ON THEIR WAY</p>
                <p className="mt-2 text-[17px] font-semibold">ยังไม่มีของลงขาย ร้านแรกกำลังมา</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 md:gap-x-8">
                {lines.map((line) => (
                  <CoverLink key={line.key} line={line} />
                ))}
              </div>
            )}
          </nav>

          <section aria-labelledby="contents" className="md:col-span-5 md:col-start-8 md:row-start-2">
            <h2 id="contents" className="cond text-[64px] leading-[0.9] md:text-[60px]">
              CONTENTS
            </h2>
            <p className="mt-1.5 mb-3 text-sm text-muted">ตัวเลขด้านขวาคือจำนวนชิ้นที่มีตอนนี้</p>
            <nav aria-label="Shop by style" className="border-t-2 border-print">
              {styles.map((style) => (
                <Link
                  key={style.slug}
                  href={`/styles/${style.slug}`}
                  className="group flex items-end gap-2.5 border-b border-print pt-3.5 pb-3 hover:text-magenta-strong"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="wide text-[19px] leading-tight">{style.name_en.toUpperCase()}</span>
                    {style.name_th.toLowerCase() !== style.name_en.toLowerCase() && (
                      <span className="text-[13px] text-muted">{style.name_th}</span>
                    )}
                  </span>
                  <span aria-hidden="true" className="mb-2.5 min-w-4 flex-1 border-b-2 border-dotted border-print" />
                  <span className="cond tabular text-[40px] leading-[0.85] text-magenta">
                    {contentsCount(style.pieces)}
                    <span className="sr-only"> ชิ้น</span>
                  </span>
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </section>

      <section aria-labelledby="new-shops" className="mx-auto w-full max-w-[1360px] px-4 pt-20 md:px-10 md:pt-28">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-print pb-3">
          <h2 id="new-shops" className="cond text-[64px] leading-[0.9] md:text-[72px]">
            NEW SHOPS
          </h2>
          <Link href="/shops" className="wide py-3 text-xs hover:text-magenta-strong">
            SEE ALL
          </Link>
        </div>
        {shops.length === 0 ? (
          <div className="py-12">
            <p className="text-muted">ยังไม่มีร้านเปิด ร้านแรกกำลังมา</p>
            <Link href="/sell/apply" className="btn mt-5">
              OPEN YOUR SHOP
            </Link>
          </div>
        ) : (
          <div className="pt-6">
            <ShopDiscRow shops={shops} size="lg" />
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-[1360px] px-4 pt-20 pb-24 md:px-10 md:pt-28 md:pb-32">
        <div className="border-t-2 border-print pt-5">
          <p className="cond max-w-[1100px] text-[50px] leading-[0.92] md:text-[88px]">
            EVERY PIECE SHOWN FRONT, BACK, LABEL AND <span className="text-magenta">FLAWS.</span> PAID FOR ONLY WHEN IT
            ARRIVES.
          </p>
          <p className="mt-4 max-w-[560px] text-[15px] text-print-soft md:text-base">
            ทุกชิ้นมีรูปหน้า หลัง ป้ายแบรนด์ และตำหนิ เงินถึงร้านเมื่อคุณยืนยันว่าได้ของแล้ว
          </p>
          <Link href="/how-it-works" className="btn mt-6">
            HOW IT WORKS
          </Link>
        </div>
      </section>
    </>
  );
}
