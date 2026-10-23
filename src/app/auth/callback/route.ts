import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { fromSupabaseError } from "@/lib/auth/credentials";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// Email links Supabase may send. Anything else is refused.
const EMAIL_LINK_TYPES = new Set<EmailOtpType>(["signup", "magiclink", "recovery", "invite", "email_change", "email"]);

/**
 * Where Google sign-in, magic links, sign-up confirmations and password
 * reset emails land. Finishes the sign-in, then continues to `next`.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const backToLogin = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));

  const reportedError = params.get("error_code") ?? params.get("error");
  if (reportedError) {
    const reason = fromSupabaseError({ code: params.get("error_code") ?? undefined });
    return backToLogin(reason);
  }

  const supabase = await createClient();
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let error: { code?: string } | null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && EMAIL_LINK_TYPES.has(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  } else {
    return backToLogin("link_expired");
  }

  if (error) {
    const reason = fromSupabaseError(error);
    return backToLogin(reason === "unknown" ? "link_expired" : reason);
  }

  return NextResponse.redirect(new URL(safeNextPath(params.get("next")), request.url));
}
