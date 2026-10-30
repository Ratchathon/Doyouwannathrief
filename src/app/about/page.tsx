import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <PageShell title="ABOUT" intro="ตลาดรวมร้านเสื้อผ้ามือสองที่คัดสไตล์แล้วจากทั่วประเทศไทย">
      <div className="flex max-w-[720px] flex-col gap-5 text-[17px]">
        <p>
          doyouwannathrift เริ่มจากความคิดง่ายๆ ว่าคนชอบของมือสองไม่ควรต้องคุ้ยกอง และร้านดีๆ ในต่างจังหวัดควรมีลูกค้าทั่วประเทศ
          เราจึงคัดที่ระดับร้าน รับเฉพาะร้านที่มีสไตล์ชัด แล้วให้ทุกชิ้นถ่ายรูปตามมาตรฐานเดียวกัน
        </p>
        <p>
          โปรเจกต์นี้เป็นผลงานเดโม ร้านและสินค้าทั้งหมดเป็นตัวอย่าง การจ่ายเงินและการส่งของเป็นการจำลอง
          สร้างด้วย Next.js, Supabase (Postgres, Auth, Storage) และ Tailwind CSS
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/how-it-works" className="btn">
            HOW IT WORKS
          </Link>
          <Link href="/login" className="btn-outline">
            TRY THE DEMO
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
