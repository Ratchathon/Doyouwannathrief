/**
 * A shop's slug is the English part of its URL: /tuekdaeng.
 * The Thai shop name is stored separately as display_name.
 *
 * Keep RESERVED_SLUGS in sync with public.reserved_slugs() in the database;
 * a test fails if they drift apart.
 */

export const SLUG_MIN = 3;
export const SLUG_MAX = 30;

/** Top-level paths the site uses or may use. A shop cannot take these. */
export const RESERVED_SLUGS = [
  "about",
  "account",
  "admin",
  "api",
  "assets",
  "auth",
  "cart",
  "categories",
  "category",
  "checkout",
  "contact",
  "dashboard",
  "discover",
  "faq",
  "favicon",
  "help",
  "how-it-works",
  "images",
  "login",
  "logout",
  "null",
  "offers",
  "orders",
  "privacy",
  "product",
  "products",
  "public",
  "register",
  "report",
  "reports",
  "robots",
  "search",
  "sell",
  "seller",
  "settings",
  "shop",
  "shops",
  "signup",
  "sitemap",
  "static",
  "style",
  "styles",
  "support",
  "terms",
  "undefined",
  "www",
] as const;

export type SlugError = "empty" | "too_short" | "too_long" | "invalid_chars" | "bad_hyphen" | "reserved";

export type SlugResult = { ok: true; slug: string } | { ok: false; error: SlugError };

const RESERVED = new Set<string>(RESERVED_SLUGS);

export function validateSlug(input: string): SlugResult {
  const slug = input.trim().toLowerCase();

  if (slug.length === 0) return { ok: false, error: "empty" };
  if (slug.length < SLUG_MIN) return { ok: false, error: "too_short" };
  if (slug.length > SLUG_MAX) return { ok: false, error: "too_long" };
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, error: "invalid_chars" };
  if (slug.startsWith("-") || slug.endsWith("-") || slug.includes("--")) {
    return { ok: false, error: "bad_hyphen" };
  }
  if (RESERVED.has(slug)) return { ok: false, error: "reserved" };

  return { ok: true, slug };
}

const MESSAGES: Record<SlugError, string> = {
  empty: "ใส่ชื่อลิงก์ร้านเป็นภาษาอังกฤษ เช่น tuekdaeng",
  too_short: `ชื่อลิงก์ต้องยาวอย่างน้อย ${SLUG_MIN} ตัวอักษร`,
  too_long: `ชื่อลิงก์ยาวได้ไม่เกิน ${SLUG_MAX} ตัวอักษร`,
  invalid_chars: "ใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง (-) ภาษาไทยใส่ในชื่อร้านแทน",
  bad_hyphen: "ขีดกลางต้องอยู่ระหว่างตัวอักษร และห้ามติดกันสองตัว",
  reserved: "ชื่อนี้เว็บใช้อยู่แล้ว ลองชื่ออื่น",
};

export function slugErrorMessage(error: SlugError): string {
  return MESSAGES[error];
}
