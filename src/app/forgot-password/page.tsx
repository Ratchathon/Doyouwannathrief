import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth-forms";
import { PageShell } from "@/components/page-shell";
import { requestPasswordReset } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <PageShell title="FORGOT PASSWORD" intro="ใส่อีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้">
      <div className="max-w-[480px]">
        <ForgotForm action={requestPasswordReset} />
      </div>
    </PageShell>
  );
}
