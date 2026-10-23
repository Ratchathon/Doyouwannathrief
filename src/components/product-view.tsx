"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductPage } from "@/lib/catalog/shop";
import { formatBaht } from "@/lib/search/results";

const PHOTO_NAMES: Record<string, { en: string; th: string }> = {
  front: { en: "FRONT", th: "ด้านหน้า" },
  back: { en: "BACK", th: "ด้านหลัง" },
  label: { en: "LABEL", th: "ป้ายแบรนด์" },
  flaw: { en: "FLAW", th: "ตำหนิ" },
  extra: { en: "MORE", th: "เพิ่มเติม" },
};

const label = "font-label text-xs font-semibold tracking-[0.14em] text-muted";
const COMING_SOON = "ระบบสั่งซื้อกำลังจะเปิด เร็วๆ นี้";

function StatusOrActions({ status, compact = false }: { status: string; compact?: boolean }) {
  if (status === "reserved" || status === "sold") {
    return (
      <p
        className={`flex items-center justify-center rounded-full border border-line-strong font-display tracking-button text-fg-soft ${
          compact ? "h-[52px] flex-1 text-[17px]" : "h-14 text-xl"
        }`}
      >
        {status === "sold" ? "SOLD" : "RESERVED"}
      </p>
    );
  }
  const height = compact ? "h-[52px] text-[17px]" : "h-14 text-xl";
  return (
    <>
      <button type="button" disabled className={`btn-chrome ${height} ${compact ? "order-2 flex-[2]" : "w-full"}`}>
        BUY NOW
      </button>
      <button
        type="button"
        disabled
        className={`inline-flex ${height} cursor-not-allowed items-center justify-center rounded-full border border-line-strong font-display tracking-button text-fg opacity-60 ${
          compact ? "order-1 flex-1" : "w-full"
        }`}
      >
        MAKE AN OFFER
      </button>
    </>
  );
}

export function ProductView({ product }: { product: ProductPage }) {
  const kinds = product.photos.map((p) => p.kind);
  const [current, setCurrent] = useState(kinds[0] ?? "front");

  // A link ending in #photo-flaw opens straight on that photo.
  useEffect(() => {
    const fromHash = () => {
      const kind = window.location.hash.replace("#photo-", "");
      if (kinds.includes(kind)) setCurrent(kind);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count one view per page visit; failures are harmless and ignored.
  useEffect(() => {
    fetch("/api/views", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    }).catch(() => {});
  }, [product.id]);

  const photo = product.photos.find((p) => p.kind === current) ?? product.photos[0];
  const status = product.status;

  return (
    <div className="mx-auto w-full max-w-[1360px] pb-28 md:px-10 md:pb-24">
      <nav aria-label="Breadcrumb" className="px-4 pt-2 font-label text-xs font-semibold tracking-[0.14em] text-faint md:px-0">
        <Link href={`/${product.shop.slug}`} className="hover:text-fg">
          {product.shop.name}
        </Link>{" "}
        /{" "}
        <Link href={`/categories/${product.category.value}`} className="hover:text-fg">
          {product.category.en}
        </Link>
      </nav>

      <div className="mt-4 flex flex-wrap gap-8 md:mt-6 md:gap-14">
        <section aria-label="รูปสินค้า" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3 md:flex-row-reverse md:gap-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-b from-[#1a1c20] to-[#121316] md:max-h-[820px] md:border md:border-[#23262a]">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.url}
                alt={`${product.title} · ${PHOTO_NAMES[photo.kind]?.th ?? photo.kind}`}
                className="size-full object-cover"
              />
            ) : null}
            {status !== "active" && (
              <span className="chrome absolute top-3 left-3 inline-flex h-7 items-center rounded-full px-3 font-label text-xs font-bold tracking-[0.1em]">
                {status === "sold" ? "SOLD" : "RESERVED"}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 md:w-[88px] md:shrink-0 md:flex-col md:px-0">
            {product.photos.map((p) => {
              const name = PHOTO_NAMES[p.kind] ?? { en: p.kind.toUpperCase(), th: p.kind };
              const on = p.kind === current;
              return (
                <button
                  key={p.kind}
                  type="button"
                  aria-label={`ดูรูป${name.th}`}
                  aria-pressed={on}
                  onClick={() => setCurrent(p.kind)}
                  className={`relative flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full border px-4 font-label text-[11px] font-bold tracking-[0.12em] md:aspect-[4/5] md:h-auto md:w-[88px] md:items-end md:rounded-none md:px-0 md:pb-1.5 ${
                    on ? "border-fg text-fg" : "border-[#3a3e44] text-fg-soft hover:border-muted"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="absolute inset-0 hidden size-full object-cover md:block" />
                  <span className="relative md:rounded md:bg-ink/80 md:px-1.5">{name.en}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="รายละเอียดสินค้า" className="flex min-w-0 flex-[1_1_380px] flex-col gap-5 px-4 md:gap-6 md:px-0">
          <div>
            {product.brand && <p className={`${label} text-[13px] tracking-[0.16em]`}>{product.brand.toUpperCase()}</p>}
            <h1 className="mt-1.5 text-[22px] leading-snug font-medium md:mt-2 md:text-[28px]">{product.title}</h1>
            <p className="mt-3 font-display text-[40px] leading-none tracking-[0.01em] md:text-5xl">
              {formatBaht(product.priceSatang)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 border-y border-line py-4">
            <div>
              <dt className={label}>SIZE ON LABEL</dt>
              <dd className="font-display text-2xl">{product.sizeLabel}</dd>
            </div>
            <div>
              <dt className={label}>CONDITION</dt>
              <dd>{product.conditionLabel}</dd>
            </div>
            {product.measurements.length > 0 && (
              <div className="col-span-2">
                <dt className={label}>MEASUREMENTS (CM)</dt>
                <dd>
                  <ul aria-label="ขนาด (ซม.)" className="mt-2 flex gap-2.5">
                    {product.measurements.map((m) => (
                      <li key={m.label} className="flex flex-1 flex-col items-center border border-line p-2.5">
                        <span className="font-display text-[26px] leading-none">{m.cm}</span>
                        <span className="text-[13px] text-muted">{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>

          {product.flawsNote && (
            <div className="border border-[#5a4a2a] bg-[#17140e] px-4 py-3.5">
              <p className="font-label text-xs font-bold tracking-[0.14em] text-[#e8c887]">FLAWS</p>
              <p className="mt-1">{product.flawsNote}</p>
              {kinds.includes("flaw") && (
                <button
                  type="button"
                  onClick={() => setCurrent("flaw")}
                  className="mt-1.5 cursor-pointer text-sm text-[#e8c887] underline underline-offset-4"
                >
                  ดูจุดตำหนิในรูป
                </button>
              )}
            </div>
          )}

          <div className="hidden flex-col gap-2.5 md:flex">
            <StatusOrActions status={status} />
            {status === "active" && <p className="text-sm text-muted">{COMING_SOON}</p>}
            <p className="text-sm text-muted">จ่ายผ่าน PromptPay เงินถึงร้านเมื่อคุณกดยืนยันว่าได้ของแล้ว</p>
          </div>

          {product.styles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.styles.map((s) => (
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

          <Link
            href={`/${product.shop.slug}`}
            className="flex items-center justify-between gap-4 border-y border-line py-4 text-fg hover:text-white"
          >
            <span className="flex flex-col">
              <span className={label}>SOLD BY</span>
              <span className="font-display text-[26px] leading-tight md:text-[28px]">{product.shop.name}</span>
              <span className="text-sm text-muted">{product.shop.province}</span>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {product.description && <p className="text-[15px] text-[#b4b9bf]">{product.description}</p>}
          <Link
            href={`/report?product=${product.id}`}
            className="self-start text-sm text-faint underline underline-offset-4 hover:text-fg-soft"
          >
            แจ้งปัญหาสินค้านี้
          </Link>
        </section>
      </div>

      {/* Phone: actions stay at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="flex gap-2.5">
          <StatusOrActions status={status} compact />
        </div>
        {status === "active" && <p className="mt-1.5 text-center text-xs text-muted">{COMING_SOON}</p>}
      </div>
    </div>
  );
}
