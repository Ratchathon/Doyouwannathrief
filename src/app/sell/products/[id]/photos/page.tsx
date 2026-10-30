import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { ItemButton } from "@/components/sell/item-actions";
import { PhotoSlots } from "@/components/sell/photo-slots";
import { requireUser } from "@/lib/auth/guards";
import { missingPhotos } from "@/lib/products/listing";
import { publishListing } from "@/lib/products/actions";
import { getMyItem } from "@/lib/sell/shop-owner";

export const metadata: Metadata = { title: "Photos" };

async function PhotosContent({ params }: PageProps<"/sell/products/[id]/photos">) {
  const { id } = await params;
  await requireUser(`/sell/products/${id}/photos`);
  const item = await getMyItem(id);
  if (!item) notFound();
  const ready = missingPhotos(item.photos.map((p) => p.kind), item.hasFlaws).length === 0;
  return (
    <div className="flex flex-col gap-8">
      <p className="text-lg font-semibold">{item.values.title}</p>
      <PhotoSlots shopId={item.shopId} productId={id} hasFlaws={item.hasFlaws} photos={item.photos} />
      <div className="flex flex-wrap items-start gap-3 border-t-2 border-print pt-5">
        {item.status === "draft" && ready && <ItemButton action={publishListing} productId={id} label="PUBLISH NOW" variant="solid" />}
        {item.status === "active" && <p className="bg-highlight px-3 py-2 font-medium">ชิ้นนี้ขึ้นขายอยู่แล้ว</p>}
        <Link href="/sell/products" className="btn-outline">
          BACK TO MY ITEMS
        </Link>
      </div>
      <p className="text-sm text-muted">รูปถูกย่อและแปลงเป็น WebP ในเครื่องก่อนอัปโหลด ข้อมูลตำแหน่งในรูปถูกตัดออก</p>
    </div>
  );
}

export default function PhotosPage(props: PageProps<"/sell/products/[id]/photos">) {
  return (
    <PageShell title="PHOTOS" width="wide" intro="ถ่ายบนพื้นเรียบ แสงพอ เห็นสีจริง ทุกร้านใช้มาตรฐานเดียวกัน">
      <Suspense fallback={<FormSkeleton />}>
        <PhotosContent {...props} />
      </Suspense>
    </PageShell>
  );
}
