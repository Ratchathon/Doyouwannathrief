import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResetForm } from "@/components/auth-forms";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { signOut, updatePassword } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

const SHOP_STATUS: Record<string, string> = {
  pending: "รอแอดมินตรวจ",
  approved: "เปิดร้านแล้ว",
  rejected: "ถูกตีกลับ แก้แล้วส่งใหม่ได้",
};

const row = "group flex items-center justify-between gap-4 border-b border-print py-4 hover:text-magenta-strong";

async function AccountContent() {
  const userId = await requireUser("/account");
  const supabase = await createClient();
  const [{ data: claims }, { data: profile }, { data: shop }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
    supabase.from("shops").select("slug, display_name, status").eq("owner_id", userId).maybeSingle(),
  ]);
  const email = (claims?.claims?.email as string | undefined) ?? "";
  const links: { href: string; title: string; note: string }[] = [
    { href: "/account/orders", title: "MY ORDERS", note: "ของที่ซื้อ และสถานะการส่ง" },
    { href: "/account/offers", title: "MY OFFERS", note: "ข้อเสนอราคาที่ยื่นไว้" },
    { href: "/account/notifications", title: "NOTIFICATIONS", note: "ข่าวเรื่องข้อเสนอและคำสั่งซื้อ" },
    shop
      ? { href: "/sell", title: "MY SHOP", note: `${shop.display_name} · ${SHOP_STATUS[shop.status] ?? shop.status}` }
      : { href: "/sell/apply", title: "OPEN A SHOP", note: "สมัครเปิดร้านมือสองของคุณ" },
  ];
  if (profile?.role === "admin") links.push({ href: "/admin", title: "ADMIN", note: "อนุมัติร้าน และรายงานปัญหา" });

  return (
    <div className="grid gap-14 md:grid-cols-[minmax(0,1fr)_400px] md:gap-16">
      <div>
        <p className="label-wide">SIGNED IN AS</p>
        <p className="mt-1 text-lg font-semibold break-all">{email}</p>
        <nav aria-label="Account" className="mt-6 border-t-2 border-print">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={row}>
              <span className="flex flex-col">
                <span className="wide text-[17px]">{l.title}</span>
                <span className="text-sm text-muted">{l.note}</span>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </Link>
          ))}
        </nav>
        <form action={signOut} className="mt-8">
          <button type="submit" className="btn-outline">
            LOG OUT
          </button>
        </form>
      </div>
      <section aria-labelledby="password">
        <h2 id="password" className="cond mb-4 text-[40px] leading-none">
          CHANGE PASSWORD
        </h2>
        <ResetForm action={updatePassword} />
      </section>
    </div>
  );
}

export default function AccountPage() {
  return (
    <PageShell title="ACCOUNT">
      <Suspense fallback={<FormSkeleton />}>
        <AccountContent />
      </Suspense>
    </PageShell>
  );
}
