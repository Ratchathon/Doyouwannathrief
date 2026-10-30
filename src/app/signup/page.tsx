import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth-forms";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { signUpWithPassword } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Sign up" };

async function SignupContent({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  return <SignupForm action={signUpWithPassword} next={safeNextPath(typeof params.next === "string" ? params.next : null)} />;
}

export default function SignupPage(props: PageProps<"/signup">) {
  return (
    <PageShell title="SIGN UP" intro="สมัครด้วยอีเมล ใช้ได้ทั้งซื้อและเปิดร้าน">
      <div className="max-w-[480px]">
        <Suspense fallback={<FormSkeleton />}>
          <SignupContent {...props} />
        </Suspense>
      </div>
    </PageShell>
  );
}
