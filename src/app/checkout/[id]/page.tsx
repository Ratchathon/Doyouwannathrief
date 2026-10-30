import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DemoQr } from "@/components/demo-qr";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { TradeButton } from "@/components/trade";
import { DemoBanner, Deadline, ORDER_STATUS, Tag } from "@/components/trade-cards";
import { requireUser } from "@/lib/auth/guards";
import { cancelOrder, payOrder } from "@/lib/trade/actions";
import { getOrder } from "@/lib/trade/data";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

async function CheckoutContent({ params }: PageProps<"/checkout/[id]">) {
  const { id } = await params;
  const userId = await requireUser(`/checkout/${id}`);
  const order = await getOrder(id, userId);
  if (!order) notFound();
  const status = ORDER_STATUS[order.status];

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_360px] md:gap-16">
      <div className="flex flex-col gap-5">
        <DemoBanner />
        <div className="flex gap-4">
          <div className="size-28 shrink-0 overflow-hidden bg-photo">
            {order.product.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.product.photo} alt={order.product.title} className="size-full object-cover" />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold">{order.product.title}</p>
            <p className="wide text-[11px]">{order.product.shopName}</p>
            <Tag {...status} />
          </div>
        </div>
        <dl className="border-y-2 border-print py-4">
          <dt className="label-wide">TOTAL</dt>
          <dd className="cond text-[72px] leading-none">{order.price}</dd>
          <dd className="mt-1 text-sm text-muted">ส่งฟรีในเดโม · เงินถูกพักไว้จนกว่าคุณกดยืนยันว่าได้ของ</dd>
        </dl>
        {order.status === "awaiting_payment" && (
          <p>
            ชำระภายใน <Deadline at={order.payBy} /> ไม่อย่างนั้นของจะกลับไปขายต่อ
          </p>
        )}
      </div>

      <div className="flex flex-col items-start gap-4">
        {order.status === "awaiting_payment" ? (
          <>
            <div className="border-2 border-print bg-white p-3">
              <DemoQr seed={order.id} />
            </div>
            <p className="text-sm text-muted">QR นี้เป็นของจำลอง สแกนไม่ได้ กดปุ่มด้านล่างแทนการโอน</p>
            <TradeButton action={payOrder} fields={{ orderId: order.id }} label="PAY (DEMO)" variant="magenta" />
            <TradeButton action={cancelOrder} fields={{ orderId: order.id }} label="CANCEL ORDER" variant="outline" />
          </>
        ) : (
          <>
            <p className="bg-highlight px-4 py-3 text-lg font-semibold">{order.status === "cancelled" ? "คำสั่งซื้อนี้ยกเลิกแล้ว" : "จ่ายแล้ว ขอบคุณ ร้านจะแพ็กของส่งให้"}</p>
            <Link href="/account/orders" className="btn">
              MY ORDERS
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage(props: PageProps<"/checkout/[id]">) {
  return (
    <PageShell title="CHECKOUT" width="wide">
      <Suspense fallback={<FormSkeleton />}>
        <CheckoutContent {...props} />
      </Suspense>
    </PageShell>
  );
}
