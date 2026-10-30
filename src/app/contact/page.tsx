import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <PageShell title="CONTACT" intro="เว็บนี้เป็นเดโม ยังไม่มีทีมบริการลูกค้า">
      <ul className="max-w-[720px] border-t-2 border-print">
        {[
          ["/report", "REPORT A PROBLEM", "เจอของปลอม ร้านทำตัวไม่ดี หรือเว็บพัง แจ้งได้ที่นี่ แอดมินจะตรวจทุกเรื่อง"],
          ["/sell/apply", "OPEN A SHOP", "อยากเปิดร้านมือสองในเว็บ"],
          ["/how-it-works#faq", "FAQ", "คำถามที่ถามบ่อย"],
        ].map(([href, title, note]) => (
          <li key={href}>
            <Link href={href} className="flex flex-col border-b border-print py-4 hover:text-magenta-strong">
              <span className="wide text-[17px]">{title}</span>
              <span className="text-sm text-muted">{note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
