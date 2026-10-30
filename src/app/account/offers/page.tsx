import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { AmountForm, TradeButton } from "@/components/trade";
import { Deadline, EmptyLine, OFFER_STATUS, Tag, TradeRow } from "@/components/trade-cards";
import { requireUser } from "@/lib/auth/guards";
import { answerCounter, withdrawOffer } from "@/lib/trade/actions";
import { getBuyerOffers } from "@/lib/trade/data";

export const metadata: Metadata = { title: "My offers" };

async function OffersContent() {
  const userId = await requireUser("/account/offers");
  const offers = await getBuyerOffers(userId);
  if (offers.length === 0) return <EmptyLine text="ยังไม่ได้ยื่นข้อเสนอ เปิดหน้าสินค้าแล้วกด MAKE AN OFFER" href="/discover" cta="DISCOVER" />;
  return (
    <ul className="border-t-2 border-print">
      {offers.map((o) => (
        <TradeRow
          key={o.id}
          product={o.product}
          side={
            o.status === "countered" ? (
              <>
                <TradeButton action={answerCounter} fields={{ offerId: o.id, answer: "accept" }} label={`ACCEPT ${o.counter}`} />
                <AmountForm action={answerCounter} fields={{ offerId: o.id, answer: "raise" }} label="หรือเสนอราคาใหม่ (บาท)" submit="SEND" />
                <TradeButton action={answerCounter} fields={{ offerId: o.id, answer: "decline" }} label="NO THANKS" variant="outline" />
              </>
            ) : o.status === "pending_shop" ? (
              <TradeButton action={withdrawOffer} fields={{ offerId: o.id }} label="WITHDRAW" variant="outline" />
            ) : null
          }
        >
          <span className="text-sm">
            ราคาขาย {o.product.price} · คุณเสนอ <span className="cond text-[26px]">{o.amount}</span>
            {o.counter && o.status === "countered" && (
              <>
                {" "}
                · ร้านเสนอกลับ <span className="cond text-[26px] text-magenta">{o.counter}</span>
              </>
            )}
          </span>
          <Tag {...(OFFER_STATUS[o.status] ?? { en: o.status.toUpperCase(), th: "", tone: "line" })} />
          {(o.status === "pending_shop" || o.status === "countered") && <Deadline at={o.respondBy} />}
        </TradeRow>
      ))}
    </ul>
  );
}

export default function MyOffersPage() {
  return (
    <PageShell title="MY OFFERS" width="wide" intro="ร้านตอบภายใน 24 ชม. ต่อรองกันได้ 3 รอบ ยื่นได้ชิ้นละ 3 ครั้ง">
      <Suspense fallback={<FormSkeleton />}>
        <OffersContent />
      </Suspense>
    </PageShell>
  );
}
