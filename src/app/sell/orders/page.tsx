import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { AmountForm } from "@/components/trade";
import { DemoBanner, Deadline, EmptyLine, ORDER_STATUS, Tag, TradeRow } from "@/components/trade-cards";
import { requireUser } from "@/lib/auth/guards";
import { getMyShop } from "@/lib/sell/shop-owner";
import { shipOrder } from "@/lib/trade/actions";
import { getOrders } from "@/lib/trade/data";

export const metadata: Metadata = { title: "Shop orders" };

async function ShopOrdersContent() {
  const userId = await requireUser("/sell/orders");
  const shop = await getMyShop(userId);
  if (!shop || shop.status !== "approved") redirect("/sell");
  const orders = await getOrders({ shop: shop.id });
  if (orders.length === 0) return <EmptyLine text="ยังไม่มีคำสั่งซื้อ" href="/sell/products" cta="MY ITEMS" />;
  return (
    <ul className="border-t-2 border-print">
      {orders.map((o) => (
        <TradeRow
          key={o.id}
          product={o.product}
          side={o.status === "paid" ? <AmountForm action={shipOrder} fields={{ orderId: o.id }} label="เลขพัสดุ" name="tracking" inputMode="text" submit="SHIPPED" /> : null}
        >
          <span className="cond text-[30px] leading-none">{o.price}</span>
          <Tag {...ORDER_STATUS[o.status]} />
          {o.status === "awaiting_payment" && (
            <span className="text-sm">
              รอผู้ซื้อจ่าย <Deadline at={o.payBy} />
            </span>
          )}
          {o.status === "completed" && <span className="text-sm font-semibold">เงินเข้าร้านแล้ว (เดโม)</span>}
          {o.tracking && <span className="text-sm">เลขพัสดุ: {o.tracking}</span>}
        </TradeRow>
      ))}
    </ul>
  );
}

export default function ShopOrdersPage() {
  return (
    <PageShell title="ORDERS" width="wide" intro="ผู้ซื้อจ่ายแล้วให้แพ็กของและใส่เลขพัสดุ เงินเข้าร้านหลังผู้ซื้อกดได้ของแล้ว">
      <DemoBanner />
      <Suspense fallback={<FormSkeleton />}>
        <ShopOrdersContent />
      </Suspense>
    </PageShell>
  );
}
