import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopReviewForm } from "@/components/admin-forms";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { reviewShop } from "@/lib/shops/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Shop applications", robots: { index: false } };

type Row = {
  id: string;
  slug: string;
  display_name: string;
  province: string;
  bio: string;
  created_at: string;
  shop_styles: { styles: { name_en: string } | null }[] | null;
  social_links: string[] | null;
};

async function ShopsContent() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("id, slug, display_name, province, bio, created_at, social_links, shop_styles(styles(name_en))")
    .eq("status", "pending")
    .order("created_at");
  const rows = (data as unknown as Row[] | null) ?? [];
  if (rows.length === 0) return <p className="text-muted">ไม่มีร้านรออนุมัติ</p>;
  return (
    <ul className="border-t-2 border-print">
      {rows.map((s) => (
        <li key={s.id} className="grid gap-5 border-b border-print py-6 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-2">
            <p className="cond text-[40px] leading-none">{s.display_name}</p>
            <p className="wide text-xs">
              /{s.slug} · {s.province}
            </p>
            <p className="wide text-[11px] text-muted">
              {(s.shop_styles ?? []).map((x) => x.styles?.name_en.toUpperCase()).filter(Boolean).join(" · ")}
            </p>
            {s.bio && <p>{s.bio}</p>}
            <ul className="flex flex-col gap-1">
              {(s.social_links ?? []).map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <ShopReviewForm action={reviewShop} shopId={s.id} />
        </li>
      ))}
    </ul>
  );
}

export default function AdminShopsPage() {
  return (
    <PageShell title="SHOP APPLICATIONS" width="wide" intro="ดูสไตล์ร้านจากลิงก์โซเชียล รับเฉพาะร้านที่มีสไตล์ชัด">
      <Suspense fallback={<FormSkeleton />}>
        <ShopsContent />
      </Suspense>
    </PageShell>
  );
}
