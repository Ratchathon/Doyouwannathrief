import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ReportUpdateForm } from "@/components/admin-forms";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { updateReport } from "@/lib/reports/actions";
import { REPORT_REASONS, type ReportTarget } from "@/lib/reports/report";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

type Row = {
  id: string;
  target_type: ReportTarget;
  reason: string;
  details: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  products: { id: string; title: string; shops: { slug: string } | null } | null;
  shops: { slug: string; display_name: string } | null;
};

const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

async function ReportsContent() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id, target_type, reason, details, status, admin_note, created_at, products(id, title, shops(slug)), shops(slug, display_name)")
    .neq("status", "closed")
    .order("created_at");
  const rows = (data as unknown as Row[] | null) ?? [];
  if (rows.length === 0) return <p className="text-muted">ไม่มีเรื่องค้าง</p>;
  return (
    <ul className="border-t-2 border-print">
      {rows.map((r) => {
        const reasons: Record<string, string> = REPORT_REASONS[r.target_type];
        return (
          <li key={r.id} className="grid gap-5 border-b border-print py-6 md:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-2">
              <p className="wide text-xs">
                {r.target_type.toUpperCase()} · {date.format(new Date(r.created_at))}
              </p>
              {r.products && (
                <Link href={`/${r.products.shops?.slug}/${r.products.id}`} className="font-semibold underline underline-offset-4">
                  {r.products.title}
                </Link>
              )}
              {r.shops && (
                <Link href={`/${r.shops.slug}`} className="font-semibold underline underline-offset-4">
                  {r.shops.display_name}
                </Link>
              )}
              <p className="inline-block self-start bg-highlight px-2 py-0.5 font-medium">{reasons[r.reason] ?? r.reason}</p>
              <p className="whitespace-pre-line">{r.details}</p>
            </div>
            <ReportUpdateForm action={updateReport} reportId={r.id} status={r.status} note={r.admin_note} />
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminReportsPage() {
  return (
    <PageShell title="REPORTS" width="wide" intro="เรื่องที่ผู้ใช้แจ้งเข้ามา เรียงจากเก่าสุด">
      <Suspense fallback={<FormSkeleton />}>
        <ReportsContent />
      </Suspense>
    </PageShell>
  );
}
