import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * For member pages. Returns the signed-in user's id, or sends the visitor to
 * sign-in and back to `returnTo` afterwards. The proxy already does this; the
 * page checks again because pages must never rely on the proxy alone.
 */
export async function requireUser(returnTo: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return userId;
}

/**
 * For admin pages. Anyone who is not an admin, signed in or not, gets the
 * ordinary not-found page.
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) notFound();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (profile?.role !== "admin") notFound();

  return userId;
}
