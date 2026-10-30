import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { ListingForm } from "@/components/sell/listing-form";
import { requireUser } from "@/lib/auth/guards";
import { getNavData } from "@/lib/catalog/nav";
import { saveListing } from "@/lib/products/actions";
import { getMyShop } from "@/lib/sell/shop-owner";

export const metadata: Metadata = { title: "New listing" };

async function NewContent() {
  const userId = await requireUser("/sell/products/new");
  const shop = await getMyShop(userId);
  if (!shop) redirect("/sell/apply");
  if (shop.status !== "approved") redirect("/sell");
  const { styles } = await getNavData();
  return <ListingForm action={saveListing} styles={styles} />;
}

export default function NewListingPage() {
  return (
    <PageShell title="NEW LISTING" intro="ขั้นแรกกรอกข้อมูล ขั้นต่อไปถ่ายรูป หน้า หลัง ป้าย (และตำหนิถ้ามี)">
      <div className="max-w-[760px]">
        <Suspense fallback={<FormSkeleton />}>
          <NewContent />
        </Suspense>
      </div>
    </PageShell>
  );
}
