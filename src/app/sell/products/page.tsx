import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { ItemButton } from "@/components/sell/item-actions";
import { StatusLabel } from "@/components/sell/status-label";
import { requireUser } from "@/lib/auth/guards";
import { markSold, publishListing, unpublishListing } from "@/lib/products/actions";
import { PHOTO_LABELS } from "@/lib/products/listing";
import { getMyItems, getMyShop, nextStep } from "@/lib/sell/shop-owner";

export const metadata: Metadata = { title: "My items" };

async function ItemsContent() {
  const userId = await requireUser("/sell/products");
  const shop = await getMyShop(userId);
  if (!shop) redirect("/sell/apply");
  if (shop.status !== "approved") redirect("/sell");
  const items = await getMyItems(shop.id);

  if (items.length === 0) {
    return (
      <div>
        <p className="text-muted">ยังไม่มีสินค้า เริ่มลงชิ้นแรกได้เลย</p>
        <Link href="/sell/products/new" className="btn mt-5">
          NEW LISTING
        </Link>
      </div>
    );
  }
  return (
    <div>
      <Link href="/sell/products/new" className="btn">
        NEW LISTING
      </Link>
      <ul className="mt-6 border-t-2 border-print">
        {items.map((item) => {
          const step = nextStep(item.status, item.missing);
          return (
            <li key={item.id} className="flex flex-wrap items-center gap-4 border-b border-print py-4">
              <div className="size-20 shrink-0 overflow-hidden bg-photo">
                {item.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-1">
                <StatusLabel status={item.status} />
                <Link href={`/sell/products/${item.id}`} className="line-clamp-2 font-semibold hover:text-magenta-strong">
                  {item.title}
                </Link>
                <span className="text-sm">
                  <span className="cond text-[22px]">{item.price}</span> · SIZE {item.size}
                </span>
                {item.status === "draft" && item.missing.length > 0 && (
                  <span className="text-sm text-muted">ยังขาดรูป: {item.missing.map((k) => PHOTO_LABELS[k]).join(", ")}</span>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                {step === "ADD PHOTOS" && (
                  <Link href={`/sell/products/${item.id}/photos`} className="btn h-10 px-4 text-[11px]">
                    ADD PHOTOS
                  </Link>
                )}
                {step === "PUBLISH" && <ItemButton action={publishListing} productId={item.id} label="PUBLISH" variant="solid" />}
                {step === "MARK SOLD" && <ItemButton action={markSold} productId={item.id} label="MARK SOLD" variant="solid" confirm="ขายชิ้นนี้นอกเว็บแล้ว? จะเอาออกจากหน้าร้าน" />}
                {item.status === "active" && <ItemButton action={unpublishListing} productId={item.id} label="HIDE" />}
                {(item.status === "draft" || item.status === "active") && (
                  <Link href={`/sell/products/${item.id}/photos`} className="btn-outline h-10 px-4 text-[11px]">
                    PHOTOS
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MyItemsPage() {
  return (
    <PageShell title="MY ITEMS" width="wide" intro="ลงของ เติมรูป กดขายแล้วได้ในแตะเดียวเมื่อขายนอกเว็บ">
      <Suspense fallback={<FormSkeleton />}>
        <ItemsContent />
      </Suspense>
    </PageShell>
  );
}
