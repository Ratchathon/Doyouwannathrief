"use server";

import { redirect } from "next/navigation";
import {
  authErrorMessage,
  fromSupabaseError,
  validateEmail,
  validatePassword,
  type AuthError,
} from "@/lib/auth/credentials";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/** What a sign-in form shows after submitting. */
export type FormState = { error: string | null; sent?: boolean };

const RESET_PASSWORD_PATH = "/auth/reset-password";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function fail(error: AuthError): FormState {
  return { error: authErrorMessage(error) };
}

/** Link back into the site that Supabase puts in emails and OAuth redirects. */
function callbackUrl(next: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${site}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInWithPassword(_prev: FormState | null, form: FormData): Promise<FormState> {
  const email = validateEmail(text(form, "email"));
  if (!email.ok) return fail(email.error);
  const password = validatePassword(text(form, "password"));
  if (!password.ok) return fail(password.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.value, password: password.value });
  if (error) return fail(fromSupabaseError(error));

  redirect(safeNextPath(text(form, "next")));
}

export async function signUpWithPassword(_prev: FormState | null, form: FormData): Promise<FormState> {
  const email = validateEmail(text(form, "email"));
  if (!email.ok) return fail(email.error);
  const password = validatePassword(text(form, "password"));
  if (!password.ok) return fail(password.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: { emailRedirectTo: callbackUrl(safeNextPath(text(form, "next"))) },
  });
  if (error) return fail(fromSupabaseError(error));

  return { error: null, sent: true };
}

export async function sendMagicLink(_prev: FormState | null, form: FormData): Promise<FormState> {
  const email = validateEmail(text(form, "email"));
  if (!email.ok) return fail(email.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: { emailRedirectTo: callbackUrl(safeNextPath(text(form, "next"))) },
  });
  if (error) return fail(fromSupabaseError(error));

  return { error: null, sent: true };
}

export async function signInWithGoogle(form: FormData): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(safeNextPath(text(form, "next"))) },
  });
  if (error || !data.url) redirect(`/login?error=${fromSupabaseError(error ?? {})}`);

  redirect(data.url);
}

export async function requestPasswordReset(_prev: FormState | null, form: FormData): Promise<FormState> {
  const email = validateEmail(text(form, "email"));
  if (!email.ok) return fail(email.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: callbackUrl(RESET_PASSWORD_PATH),
  });
  // Report success even for unknown emails, so this form cannot be used to
  // find out who has an account. Rate limits reveal nothing, so show them.
  if (error && fromSupabaseError(error) === "rate_limited") return fail("rate_limited");

  return { error: null, sent: true };
}

export async function updatePassword(_prev: FormState | null, form: FormData): Promise<FormState> {
  const password = validatePassword(text(form, "password"));
  if (!password.ok) return fail(password.error);
  if (password.value !== text(form, "confirm")) return { error: "รหัสผ่านสองช่องไม่ตรงกัน" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.value });
  if (error) return fail(fromSupabaseError(error));

  redirect("/account");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
