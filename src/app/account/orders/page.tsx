import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { TradeButton } from "@/components/trade";
import { DemoBanner, Deadline, EmptyLine, ORDER_STATUS, Tag, TradeRow } from "@/components/trade-cards";
import { requireUser } from "@/lib/auth/guards";
import { confirmReceived } from "@/lib/trade/actions";
import { getOrders } from "@/lib/trade/data";

export const metadata: Metadata = { title: "My orders" };

async function OrdersContent() {
  const userId = await requireUser("/account/orders");
  const orders = await getOrders({ buyer: userId });
  if (orders.length === 0) return <EmptyLine text="ยังไม่มีคำสั่งซื้อ" href="/discover" cta="DISCOVER" />;
  return (
    <ul className="border-t-2 border-print">
      {orders.map((o) => (
        <TradeRow
          key={o.id}
          product={o.product}
          side={
            o.status === "awaiting_payment" ? (
              <Link href={`/checkout/${o.id}`} className="btn h-11 bg-magenta-strong px-5 text-[11px] hover:bg-print">
                PAY NOW
              </Link>
            ) : o.status === "shipped" ? (
              <TradeButton action={confirmReceived} fields={{ orderId: o.id }} label="I GOT IT" />
            ) : null
          }
        >
          <span className="cond text-[30px] leading-none">{o.price}</span>
          <Tag {...ORDER_STATUS[o.status]} />
          {o.status === "awaiting_payment" && <Deadline at={o.payBy} />}
          {o.tracking && <span className="text-sm">เลขพัสดุ: {o.tracking}</span>}
        </TradeRow>
      ))}
    </ul>
  );
}

export default function MyOrdersPage() {
  return (
    <PageShell title="MY ORDERS" width="wide">
      <DemoBanner />
      <Suspense fallback={<FormSkeleton />}>
        <OrdersContent />
      </Suspense>
    </PageShell>
  );
}
