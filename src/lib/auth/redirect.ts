const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";

/**
 * Where to send someone after they sign in. Only paths on this site are
 * allowed; anything that could leave the site (a full URL, "//host",
 * backslash and encoded variants) falls back. This stops a link like
 * /login?next=https://evil.example from bouncing users to a phishing page.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/")) return fallback;

  // Control characters and backslashes have no place in our paths and are
  // used to trick browsers into treating the value as another host.
  if (/[\u0000-\u001F\u007F\\]/.test(next)) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (decoded.startsWith("//") || decoded.includes("\\")) return fallback;

  const url = new URL(next, PLACEHOLDER_ORIGIN);
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

  return url.pathname + url.search + url.hash;
}
