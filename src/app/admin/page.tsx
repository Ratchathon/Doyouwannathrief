import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

async function AdminContent() {
  await requireAdmin();
  const supabase = await createClient();
  const [pending, reports] = await Promise.all([
    supabase.from("shops").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).neq("status", "closed"),
  ]);
  const tiles: [string, string, number, string][] = [
    ["/admin/shops", "SHOP APPLICATIONS", pending.count ?? 0, "ร้านที่รออนุมัติ"],
    ["/admin/reports", "REPORTS", reports.count ?? 0, "เรื่องที่ยังไม่ปิด"],
  ];
  return (
    <nav aria-label="Admin" className="grid gap-4 sm:grid-cols-2">
      {tiles.map(([href, title, n, note]) => (
        <Link key={href} href={href} className="flex items-end justify-between gap-4 border-2 border-print bg-sheet p-5 hover:bg-highlight">
          <span className="flex flex-col">
            <span className="cond text-[40px] leading-none">{title}</span>
            <span className="mt-1 text-sm">{note}</span>
          </span>
          <span className="cond tabular text-[72px] leading-[0.85] text-magenta">{n}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function AdminPage() {
  return (
    <PageShell title="ADMIN" width="wide">
      <Suspense fallback={<FormSkeleton />}>
        <AdminContent />
      </Suspense>
    </PageShell>
  );
}
