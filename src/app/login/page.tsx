import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoButtons, LoginForm } from "@/components/auth-forms";
import { FormSkeleton, PageShell } from "@/components/page-shell";
import { signInAsDemo, signInWithPassword } from "@/lib/auth/actions";
import { authErrorMessage, type AuthError } from "@/lib/auth/credentials";
import { safeNextPath } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Log in" };

const KNOWN_ERRORS = new Set<string>(["link_expired", "invalid_credentials", "rate_limited", "email_not_confirmed", "unknown"]);

async function LoginContent({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const code = typeof params.error === "string" && KNOWN_ERRORS.has(params.error) ? (params.error as AuthError) : null;
  return <LoginForm action={signInWithPassword} next={next} initialError={code ? authErrorMessage(code) : undefined} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <PageShell title="LOG IN" intro="เข้าสู่ระบบเพื่อซื้อ ยื่นข้อเสนอ หรือจัดการร้านของคุณ">
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <Suspense fallback={<FormSkeleton />}>
          <LoginContent {...props} />
        </Suspense>
        <section aria-labelledby="demo">
          <h2 id="demo" className="cond text-[40px] leading-none">
            TRY THE DEMO
          </h2>
          <p className="mt-2 mb-4 text-[15px] text-muted">ไม่ต้องสมัคร กดเข้าบัญชีทดลองได้เลย ข้อมูลทั้งหมดเป็นตัวอย่าง</p>
          <DemoButtons action={signInAsDemo} />
        </section>
      </div>
    </PageShell>
  );
}
