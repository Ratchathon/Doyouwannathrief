"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useState, ViewTransition } from "react";
import type { ProductPage } from "@/lib/catalog/shop";
import { photoMorphName } from "@/lib/motion";
import { formatBaht } from "@/lib/search/results";

const PHOTO_NAMES: Record<string, { en: string; th: string }> = {
  front: { en: "FRONT", th: "ด้านหน้า" },
  back: { en: "BACK", th: "ด้านหลัง" },
  label: { en: "LABEL", th: "ป้ายแบรนด์" },
  flaw: { en: "FLAW", th: "ตำหนิ" },
  extra: { en: "MORE", th: "เพิ่มเติม" },
};

const label = "wide text-[11px] tracking-[0.08em]";
const COMING_SOON = "ระบบสั่งซื้อกำลังจะเปิด เร็วๆ นี้";
const DEMO_NOTE = "เดโม: ไม่มีการตัดเงินจริง";

type TradeState = { error: string | null; message?: string };
type TradeAction = (state: TradeState | null, form: FormData) => Promise<TradeState>;
export type TradeActions = { buyNow: TradeAction; makeOffer: TradeAction };

function BuyButton({ action, productId, returnTo, className }: { action: TradeAction; productId: string; returnTo: string; className: string }) {
  const [state, submit, pending] = useActionState(action, null);
  return (
    <form action={submit} className={className}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        disabled={pending}
        className="wide inline-flex h-full w-full cursor-pointer items-center justify-center bg-magenta-strong text-[15px] text-white hover:bg-print disabled:cursor-wait"
      >
        {pending ? "…" : "BUY NOW"}
      </button>
      {state?.error && (
        <p role="alert" className="mt-1.5 bg-highlight px-2 py-1 text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

function OfferDialog({ action, productId, returnTo, price, onClose }: { action: TradeAction; productId: string; returnTo: string; price: string; onClose: () => void }) {
  const [state, submit, pending] = useActionState(action, null);
  const amountId = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div aria-hidden="true" className="absolute inset-0 bg-print/45" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="MAKE AN OFFER" className="relative w-full max-w-[480px] border-t-2 border-print bg-paper p-5 md:border-2">
        <div className="flex items-start justify-between gap-4">
          <p className="cond text-[40px] leading-none">MAKE AN OFFER</p>
          <button type="button" aria-label="ปิด" onClick={onClose} className="inline-flex size-11 items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-sm">
          <li>ราคาขาย {price} เสนอต่ำกว่านี้ได้ ร้านมีราคาต่ำสุดที่รับได้ซึ่งไม่เปิดเผย</li>
          <li>ร้านตอบภายใน 24 ชม. และต่อรองกลับได้ 3 รอบ</li>
          <li>ถ้ามีคนเสนอสูงกว่า ข้อเสนอของคุณจะหลุด ยื่นได้ชิ้นละ 3 ครั้ง</li>
          <li>ตกลงแล้วต้องจ่ายภายใน 10 ชม. ({DEMO_NOTE})</li>
        </ul>
        {state?.message ? (
          <p role="status" className="mt-4 bg-highlight px-3 py-2 font-medium">
            {state.message}
          </p>
        ) : (
          <form action={submit} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <label htmlFor={amountId} className="label-wide">
              ราคาที่เสนอ (บาท)
            </label>
            <input id={amountId} name="amount" inputMode="numeric" required className="field text-lg" />
            {state?.error && (
              <p role="alert" className="bg-highlight px-2 py-1">
                {state.error}
              </p>
            )}
            <button type="submit" disabled={pending} className="btn h-[52px]">
              SEND OFFER
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function StatusOrActions({
  status,
  compact = false,
  trade,
  productId,
  returnTo,
  price,
}: {
  status: string;
  compact?: boolean;
  trade?: TradeActions;
  productId: string;
  returnTo: string;
  price: string;
}) {
  const [offering, setOffering] = useState(false);
  if (status === "reserved" || status === "sold") {
    return (
      <p className={`wide flex items-center justify-center border-2 border-print text-sm ${compact ? "h-[52px] flex-1" : "h-14"}`}>
        {status === "sold" ? "SOLD" : "RESERVED"}
      </p>
    );
  }
  const height = compact ? "h-[52px]" : "h-14";
  if (!trade) {
    return (
      <>
        <button type="button" disabled className={`wide inline-flex ${height} cursor-not-allowed items-center justify-center bg-magenta-strong text-[15px] text-white opacity-60 ${compact ? "order-2 flex-[1.4]" : "w-full"}`}>
          BUY NOW
        </button>
        <button type="button" disabled className={`wide inline-flex ${height} cursor-not-allowed items-center justify-center border-2 border-print bg-sheet text-xs text-print opacity-60 ${compact ? "order-1 flex-1" : "w-full"}`}>
          MAKE AN OFFER
        </button>
      </>
    );
  }
  return (
    <>
      <BuyButton action={trade.buyNow} productId={productId} returnTo={returnTo} className={`${height} ${compact ? "order-2 flex-[1.4]" : "w-full"}`} />
      <button
        type="button"
        onClick={() => setOffering(true)}
        className={`wide inline-flex ${height} cursor-pointer items-center justify-center border-2 border-print bg-sheet text-xs text-print hover:bg-highlight ${compact ? "order-1 flex-1" : "w-full"}`}
      >
        MAKE AN OFFER
      </button>
      {offering && <OfferDialog action={trade.makeOffer} productId={productId} returnTo={returnTo} price={price} onClose={() => setOffering(false)} />}
    </>
  );
}

export function ProductView({ product, trade }: { product: ProductPage; trade?: TradeActions }) {
  const returnTo = `/${product.shop.slug}/${product.id}`;
  const actionProps = { trade, productId: product.id, returnTo, price: formatBaht(product.priceSatang) };
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
      <nav aria-label="Breadcrumb" className="wide px-4 pt-3 text-[11px] text-muted md:px-0">
        <Link href={`/${product.shop.slug}`} className="hover:text-print">
          {product.shop.name}
        </Link>{" "}
        /{" "}
        <Link href={`/categories/${product.category.value}`} className="hover:text-print">
          {product.category.en}
        </Link>
      </nav>

      <div className="mt-4 flex flex-wrap gap-8 md:mt-6 md:gap-14">
        <section aria-label="รูปสินค้า" className="flex min-w-0 flex-[999_1_560px] flex-col gap-3 md:flex-row-reverse md:gap-4">
          <ViewTransition name={photoMorphName(product.id)} share="morph" default="none">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-photo md:max-h-[820px]">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.url}
                  alt={`${product.title} · ${PHOTO_NAMES[photo.kind]?.th ?? photo.kind}`}
                  fetchPriority="high"
                  className="size-full object-cover"
                />
              ) : null}
              {status !== "active" && (
                <span className="wide absolute top-3 left-3 bg-print px-2 py-1 text-[11px] text-white">
                  {status === "sold" ? "SOLD" : "RESERVED"}
                </span>
              )}
            </div>
          </ViewTransition>
          <div className="flex overflow-x-auto px-4 md:w-[88px] md:shrink-0 md:flex-col md:gap-2 md:px-0">
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
                  className={`wide relative flex h-11 min-w-0 flex-1 shrink-0 cursor-pointer items-center justify-center border-2 border-print px-2 text-[11px] not-first:-ml-0.5 md:ml-0 md:aspect-[4/5] md:h-auto md:w-[88px] md:flex-none md:items-end md:bg-photo md:px-0 md:pb-1.5 ${
                    on ? "bg-print text-white md:border-magenta-strong" : "bg-sheet text-print hover:bg-highlight"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="absolute inset-0 hidden size-full object-cover md:block" />
                  <span className={`relative md:px-1.5 ${on ? "md:bg-print md:text-white" : "md:bg-sheet md:text-print"}`}>{name.en}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="รายละเอียดสินค้า" className="flex min-w-0 flex-[1_1_380px] flex-col gap-5 px-4 md:gap-6 md:px-0">
          <div>
            {product.brand && <p className="wide text-xs">{product.brand.toUpperCase()}</p>}
            <h1 className="mt-1.5 text-[22px] leading-snug font-semibold md:mt-2 md:text-[28px]">{product.title}</h1>
            <p className="cond mt-2 text-[68px] leading-[0.9] md:text-[84px]">
              {formatBaht(product.priceSatang)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 border-y-2 border-print py-4">
            <div>
              <dt className={label}>SIZE ON LABEL</dt>
              <dd className="cond mt-1 text-[38px] leading-none">{product.sizeLabel}</dd>
            </div>
            <div>
              <dt className={label}>CONDITION</dt>
              <dd className="mt-1 font-semibold">{product.conditionLabel}</dd>
            </div>
            {product.measurements.length > 0 && (
              <div className="col-span-2">
                <dt className={label}>MEASUREMENTS (CM)</dt>
                <dd>
                  <ul aria-label="ขนาด (ซม.)" className="mt-2 flex">
                    {product.measurements.map((m) => (
                      <li key={m.label} className="flex flex-1 flex-col border-l border-print pl-3 first:border-l-0 first:pl-0">
                        <span className="cond tabular text-[44px] leading-[0.95]">{m.cm}</span>
                        <span className="text-[13px]">{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>

          {product.flawsNote && (
            <div className="bg-highlight px-4 py-3.5">
              <p className="wide text-xs">FLAWS</p>
              <p className="mt-1 font-medium">{product.flawsNote}</p>
              {kinds.includes("flaw") && (
                <button
                  type="button"
                  onClick={() => setCurrent("flaw")}
                  className="mt-1.5 cursor-pointer py-1 text-sm font-semibold underline underline-offset-4"
                >
                  ดูจุดตำหนิในรูป
                </button>
              )}
            </div>
          )}

          <div className="hidden flex-col gap-2.5 md:flex">
            <StatusOrActions status={status} {...actionProps} />
            {status === "active" && <p className="text-sm text-muted">{trade ? DEMO_NOTE : COMING_SOON}</p>}
            <p className="text-sm text-muted">จ่ายผ่าน PromptPay เงินถึงร้านเมื่อคุณกดยืนยันว่าได้ของแล้ว</p>
          </div>

          {product.styles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.styles.map((s) => (
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

          <Link
            href={`/${product.shop.slug}`}
            className="group flex items-center justify-between gap-4 border-y-2 border-print py-4 hover:text-magenta-strong"
          >
            <span className="flex flex-col">
              <span className={label}>SOLD BY</span>
              <span className="cond text-[36px] leading-none md:text-[40px]">{product.shop.name}</span>
              <span className="text-sm text-muted">{product.shop.province}</span>
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {product.description && <p className="text-[15px] text-print-soft">{product.description}</p>}
          <Link
            href={`/report?product=${product.id}`}
            className="self-start text-sm text-muted underline underline-offset-4 hover:text-print"
          >
            แจ้งปัญหาสินค้านี้
          </Link>
        </section>
      </div>

      {/* Phone: actions stay at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-print bg-paper px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex gap-2.5">
          <StatusOrActions status={status} compact {...actionProps} />
        </div>
        {status === "active" && <p className="mt-1.5 text-center text-xs text-muted">{trade ? DEMO_NOTE : COMING_SOON}</p>}
      </div>
    </div>
  );
}
