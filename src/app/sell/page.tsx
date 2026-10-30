import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { ResubmitButton } from "@/components/sell/item-actions";
import { requireUser } from "@/lib/auth/guards";
import { getMyItems, getMyShop } from "@/lib/sell/shop-owner";
import { resubmitShop } from "@/lib/shops/actions";

export const metadata: Metadata = { title: "My shop" };

const tile = "group flex flex-col justify-between gap-6 border-2 border-print bg-sheet p-4 hover:bg-highlight";

async function SellContent() {
  const userId = await requireUser("/sell");
  const shop = await getMyShop(userId);
  if (!shop) redirect("/sell/apply");

  if (shop.status === "pending") {
    return (
      <div className="max-w-[640px]">
        <p className="bg-highlight px-4 py-3 text-lg font-semibold">ส่งใบสมัครแล้ว รอแอดมินตรวจ</p>
        <p className="mt-3">แอดมินจะดูสไตล์ร้านจากลิงก์โซเชียลที่ให้ไว้ พออนุมัติแล้วหน้านี้จะเปลี่ยนเป็นหลังร้าน ให้ลงสินค้าได้ทันที</p>
      </div>
    );
  }
  if (shop.status === "rejected") {
    return (
      <div className="flex max-w-[640px] flex-col gap-4">
        <p className="bg-print px-4 py-3 text-lg font-semibold text-white">ใบสมัครยังไม่ผ่าน</p>
        <p>
          เหตุผลจากแอดมิน: <span className="font-semibold">{shop.rejection_reason}</span>
        </p>
        <p className="text-muted">แก้ตามที่แอดมินบอก แล้วกดส่งใหม่ได้</p>
        <ResubmitButton action={resubmitShop} shopId={shop.id} />
      </div>
    );
  }

  const items = await getMyItems(shop.id);
  const count = (s: string) => items.filter((i) => i.status === s).length;
  return (
    <div className="flex flex-col gap-10">
      <p className="text-lg">
        <Link href={`/${shop.slug}`} className="wide underline underline-offset-4 hover:text-magenta-strong">
          {shop.display_name}
        </Link>{" "}
        · {shop.province}
      </p>
      <dl className="grid grid-cols-2 border-y-2 border-print sm:grid-cols-4">
        {[
          ["ON SALE", count("active")],
          ["DRAFTS", count("draft")],
          ["RESERVED", count("reserved")],
          ["SOLD", count("sold")],
        ].map(([label, n]) => (
          <div key={label} className="border-print py-4 pr-4 not-first:sm:border-l not-first:sm:pl-4">
            <dt className="label-wide">{label}</dt>
            <dd className="cond tabular text-[56px] leading-none">{n}</dd>
          </div>
        ))}
      </dl>
      <nav aria-label="Shop tools" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["/sell/products/new", "NEW LISTING", "ลงของใหม่ พร้อมรูปตามมาตรฐาน"],
          ["/sell/products", "MY ITEMS", "แก้ไข ซ่อน หรือกดขายแล้ว"],
          ["/sell/orders", "ORDERS", "คำสั่งซื้อที่ต้องส่ง"],
          ["/sell/offers", "OFFERS", "ข้อเสนอราคาที่รอตอบ"],
        ].map(([href, title, note]) => (
          <Link key={href} href={href} className={tile}>
            <span className="cond text-[36px] leading-none">{title}</span>
            <span className="text-sm">{note}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function SellPage() {
  return (
    <PageShell title="MY SHOP" width="wide">
      <Suspense fallback={<FormSkeleton />}>
        <SellContent />
      </Suspense>
    </PageShell>
  );
}
