/**
 * Supabase settings from .env.local (see .env.example).
 * The variables are referenced literally so Next.js can inline them into
 * the browser bundle.
 */
export function supabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local and fill it in.");
  if (!publishableKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local and fill it in.");
  }
  // NEXT_PUBLIC_ values ship to every visitor's browser. A secret key there
  // would bypass every row level security rule, so refuse to start.
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY holds a secret key. Use the publishable key instead.");
  }

  return { url, publishableKey };
}
