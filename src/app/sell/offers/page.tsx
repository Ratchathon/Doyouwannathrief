import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { AmountForm, TradeButton } from "@/components/trade";
import { Deadline, EmptyLine, OFFER_STATUS, Tag, TradeRow } from "@/components/trade-cards";
import { requireUser } from "@/lib/auth/guards";
import { getMyShop } from "@/lib/sell/shop-owner";
import { respondOffer } from "@/lib/trade/actions";
import { getShopOffers } from "@/lib/trade/data";

export const metadata: Metadata = { title: "Shop offers" };

async function ShopOffersContent() {
  const userId = await requireUser("/sell/offers");
  const shop = await getMyShop(userId);
  if (!shop || shop.status !== "approved") redirect("/sell");
  const offers = await getShopOffers(shop.id);
  if (offers.length === 0) return <EmptyLine text="ยังไม่มีข้อเสนอ" href="/sell/products" cta="MY ITEMS" />;
  return (
    <ul className="border-t-2 border-print">
      {offers.map((o) => (
        <TradeRow
          key={o.id}
          product={o.product}
          side={
            o.status === "pending_shop" ? (
              <>
                <TradeButton action={respondOffer} fields={{ offerId: o.id, answer: "accept" }} label={`ACCEPT ${o.amount}`} />
                {o.counterRounds < 3 && (
                  <AmountForm action={respondOffer} fields={{ offerId: o.id, answer: "counter" }} label={`เสนอกลับ (บาท) · เหลือ ${3 - o.counterRounds} รอบ`} submit="COUNTER" />
                )}
                <TradeButton action={respondOffer} fields={{ offerId: o.id, answer: "reject" }} label="DECLINE" variant="outline" />
              </>
            ) : null
          }
        >
          <span className="text-sm">
            ราคาขาย {o.product.price} · เสนอมา <span className="cond text-[26px]">{o.amount}</span>
            {o.counter && <> · คุณเสนอกลับ {o.counter}</>}
          </span>
          <Tag {...(OFFER_STATUS[o.status] ?? { en: o.status.toUpperCase(), th: "", tone: "line" })} />
          {(o.status === "pending_shop" || o.status === "countered") && <Deadline at={o.respondBy} />}
        </TradeRow>
      ))}
    </ul>
  );
}

export default function ShopOffersPage() {
  return (
    <PageShell title="OFFERS" width="wide" intro="ตอบภายใน 24 ชม. ไม่อย่างนั้นข้อเสนอหมดเวลา ต่อรองกลับได้ 3 รอบ">
      <Suspense fallback={<FormSkeleton />}>
        <ShopOffersContent />
      </Suspense>
    </PageShell>
  );
}
