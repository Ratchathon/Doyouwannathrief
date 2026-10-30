"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import type { FormState } from "@/lib/auth/actions";

export type AuthAction = (state: FormState | null, form: FormData) => Promise<FormState>;

const labelClass = "label-wide mb-1.5 block";

function Field({
  label,
  name,
  type,
  autoComplete,
  hint,
}: {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input id={id} name={name} type={type} required autoComplete={autoComplete} className="field w-full text-base" />
      {hint && <p className="mt-1.5 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}

function ErrorLine({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-highlight px-3 py-2 text-[15px] font-medium">
      {message}
    </p>
  );
}

function Submit({ children, pending }: { children: string; pending: boolean }) {
  return (
    <button type="submit" disabled={pending} className="btn h-[52px] w-full">
      {pending ? "WAIT…" : children}
    </button>
  );
}

export function LoginForm({ action, next, initialError }: { action: AuthAction; next: string; initialError?: string }) {
  const [state, submit, pending] = useActionState(action, null);
  return (
    <form action={submit} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <ErrorLine message={state ? state.error : initialError} />
      <Field label="อีเมล" name="email" type="email" autoComplete="email" />
      <Field label="รหัสผ่าน" name="password" type="password" autoComplete="current-password" />
      <Submit pending={pending}>LOG IN</Submit>
      <div className="flex flex-wrap justify-between gap-3 text-[15px]">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-magenta-strong">
          ลืมรหัสผ่าน?
        </Link>
        <span>
          ยังไม่มีบัญชี?{" "}
          <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold underline underline-offset-4 hover:text-magenta-strong">
            สมัครสมาชิก
          </Link>
        </span>
      </div>
    </form>
  );
}

export function SignupForm({ action, next }: { action: AuthAction; next: string }) {
  const [state, submit, pending] = useActionState(action, null);
  if (state?.sent) {
    return (
      <p role="status" className="bg-highlight px-4 py-3 text-[17px] font-medium">
        เช็กอีเมลของคุณ แล้วกดลิงก์ยืนยันเพื่อเริ่มใช้งาน
      </p>
    );
  }
  return (
    <form action={submit} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />
      <ErrorLine message={state?.error} />
      <Field label="อีเมล" name="email" type="email" autoComplete="email" />
      <Field label="รหัสผ่าน" name="password" type="password" autoComplete="new-password" hint="อย่างน้อย 8 ตัวอักษร" />
      <Submit pending={pending}>CREATE ACCOUNT</Submit>
      <p className="text-[15px]">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-semibold underline underline-offset-4 hover:text-magenta-strong">
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm({ action }: { action: AuthAction }) {
  const [state, submit, pending] = useActionState(action, null);
  if (state?.sent) {
    return (
      <p role="status" className="bg-highlight px-4 py-3 text-[17px] font-medium">
        ถ้าอีเมลนี้มีบัญชีอยู่ เราส่งลิงก์ตั้งรหัสใหม่ไปให้แล้ว ลิงก์ใช้ได้ครั้งเดียว
      </p>
    );
  }
  return (
    <form action={submit} className="flex flex-col gap-5">
      <ErrorLine message={state?.error} />
      <Field label="อีเมล" name="email" type="email" autoComplete="email" />
      <Submit pending={pending}>SEND RESET LINK</Submit>
      <Link href="/login" className="text-[15px] underline underline-offset-4 hover:text-magenta-strong">
        กลับไปเข้าสู่ระบบ
      </Link>
    </form>
  );
}

export function ResetForm({ action, submitLabel = "SAVE PASSWORD" }: { action: AuthAction; submitLabel?: string }) {
  const [state, submit, pending] = useActionState(action, null);
  return (
    <form action={submit} className="flex flex-col gap-5">
      <ErrorLine message={state?.error} />
      <Field label="รหัสผ่านใหม่" name="password" type="password" autoComplete="new-password" hint="อย่างน้อย 8 ตัวอักษร" />
      <Field label="ยืนยันรหัสผ่านใหม่" name="confirm" type="password" autoComplete="new-password" />
      <Submit pending={pending}>{submitLabel}</Submit>
    </form>
  );
}

const DEMOS = [
  { role: "buyer", title: "BUYER", note: "ดูของ ยื่นข้อเสนอ ซื้อแบบเดโม" },
  { role: "shop", title: "SHOP", note: "ร้าน TUEKDAENG VINTAGE ลงของ ตอบข้อเสนอ" },
  { role: "admin", title: "ADMIN", note: "อนุมัติร้าน ดูรายงานปัญหา" },
];

export function DemoButtons({ action }: { action: AuthAction }) {
  const [state, submit, pending] = useActionState(action, null);
  return (
    <form action={submit} className="flex flex-col gap-2.5">
      <ErrorLine message={state?.error} />
      {DEMOS.map((d) => (
        <button
          key={d.role}
          type="submit"
          name="role"
          value={d.role}
          disabled={pending}
          className="flex cursor-pointer items-center justify-between gap-3 border-2 border-print bg-sheet px-4 py-3 text-left hover:bg-highlight disabled:cursor-wait"
        >
          <span className="flex flex-col">
            <span className="wide text-[15px]">TRY AS {d.title}</span>
            <span className="text-[13px] text-muted">{d.note}</span>
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      ))}
    </form>
  );
}
