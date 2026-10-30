import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/auth-forms";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { updatePassword } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "New password" };

async function ResetContent() {
  // The reset link signs the user in first; without that there is nothing to change.
  await requireUser("/auth/reset-password");
  return <ResetForm action={updatePassword} />;
}

export default function ResetPasswordPage() {
  return (
    <PageShell title="NEW PASSWORD" intro="ตั้งรหัสผ่านใหม่ แล้วใช้รหัสนี้เข้าสู่ระบบครั้งต่อไป">
      <div className="max-w-[480px]">
        <Suspense fallback={<FormSkeleton />}>
          <ResetContent />
        </Suspense>
      </div>
    </PageShell>
  );
}
