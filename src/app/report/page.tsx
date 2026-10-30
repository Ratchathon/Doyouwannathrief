import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { ReportForm, type ReportTargetInfo } from "@/components/report-form";
import { requireUser } from "@/lib/auth/guards";
import { fileReport } from "@/lib/reports/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Report a problem" };

async function ReportContent({ searchParams }: PageProps<"/report">) {
  const params = await searchParams;
  const product = typeof params.product === "string" ? params.product : null;
  const shopSlug = typeof params.shop === "string" ? params.shop : null;
  await requireUser(`/report${product ? `?product=${product}` : shopSlug ? `?shop=${shopSlug}` : ""}`);
  const supabase = await createClient();

  let target: ReportTargetInfo = { type: "website" };
  if (product) {
    const { data } = await supabase.from("products").select("id, title").eq("id", product).maybeSingle();
    if (data) target = { type: "product", id: data.id, name: data.title };
  } else if (shopSlug) {
    const { data } = await supabase.from("shops").select("id, display_name").eq("slug", shopSlug).maybeSingle();
    if (data) target = { type: "shop", id: data.id, name: data.display_name };
  }
  return <ReportForm action={fileReport} target={target} />;
}

export default function ReportPage(props: PageProps<"/report">) {
  return (
    <PageShell title="REPORT A PROBLEM" intro="เจอของปลอม ของไม่ตรงปก ร้านทำตัวไม่ดี หรือเว็บพัง บอกเราได้ที่นี่">
      <div className="max-w-[640px]">
        <Suspense fallback={<FormSkeleton />}>
          <ReportContent {...props} />
        </Suspense>
      </div>
    </PageShell>
  );
}
