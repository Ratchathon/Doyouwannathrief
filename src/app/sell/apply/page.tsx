import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { ApplyForm } from "@/components/sell/apply-form";
import { requireUser } from "@/lib/auth/guards";
import { getNavData } from "@/lib/catalog/nav";
import { getMyShop } from "@/lib/sell/shop-owner";
import { applyForShop } from "@/lib/shops/actions";

export const metadata: Metadata = { title: "Open a shop" };

async function ApplyContent() {
  const userId = await requireUser("/sell/apply");
  if (await getMyShop(userId)) redirect("/sell");
  const { styles } = await getNavData();
  return <ApplyForm action={applyForShop} styles={styles} />;
}

export default function ApplyPage() {
  return (
    <PageShell title="OPEN A SHOP" intro="รับเฉพาะร้านที่มีสไตล์ชัด แอดมินจะดูจากลิงก์โซเชียลของร้าน หนึ่งบัญชีเปิดได้หนึ่งร้าน">
      <div className="max-w-[640px]">
        <Suspense fallback={<FormSkeleton />}>
          <ApplyContent />
        </Suspense>
      </div>
    </PageShell>
  );
}
