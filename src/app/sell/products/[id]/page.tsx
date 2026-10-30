import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { ItemButton } from "@/components/sell/item-actions";
import { ListingForm } from "@/components/sell/listing-form";
import { StatusLabel } from "@/components/sell/status-label";
import { requireUser } from "@/lib/auth/guards";
import { getNavData } from "@/lib/catalog/nav";
import { deleteListing, saveListing } from "@/lib/products/actions";
import { getMyItem } from "@/lib/sell/shop-owner";

export const metadata: Metadata = { title: "Edit listing" };

async function EditContent({ params }: PageProps<"/sell/products/[id]">) {
  const { id } = await params;
  await requireUser(`/sell/products/${id}`);
  const item = await getMyItem(id);
  if (!item) notFound();
  const { styles } = await getNavData();
  const frozen = item.status === "reserved" || item.status === "sold";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusLabel status={item.status} />
        <Link href={`/sell/products/${id}/photos`} className="btn-outline h-10 px-4 text-[11px]">
          PHOTOS
        </Link>
        <ItemButton action={deleteListing} productId={id} label="ลบสินค้านี้" variant="link" confirm="ลบสินค้านี้ถาวร?" />
      </div>
      {frozen ? (
        <p className="bg-highlight px-3 py-2 font-medium">สินค้าที่ติดจองหรือขายแล้วแก้ไขไม่ได้</p>
      ) : (
        <ListingForm action={saveListing} styles={styles} productId={id} initial={item.values} />
      )}
    </div>
  );
}

export default function EditListingPage(props: PageProps<"/sell/products/[id]">) {
  return (
    <PageShell title="EDIT LISTING">
      <div className="max-w-[760px]">
        <Suspense fallback={<FormSkeleton />}>
          <EditContent {...props} />
        </Suspense>
      </div>
    </PageShell>
  );
}
