import { isProvince } from "@/lib/shops/provinces";
import { slugErrorMessage, validateSlug } from "@/lib/shops/slug";

export const MAX_STYLES = 3;
export const MAX_SOCIAL_LINKS = 3;
export const DISPLAY_NAME_MAX = 80;
export const BIO_MAX = 500;

// Hosts an admin can open safely to judge a shop's style.
const SOCIAL_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
]);

export type ShopApplicationInput = {
  displayName: string;
  slug: string;
  province: string;
  bio: string;
  styles: string[];
  socialLinks: string[];
};

export type ShopApplication = ShopApplicationInput;

type Field = keyof ShopApplicationInput;

export type ApplicationResult =
  | { ok: true; value: ShopApplication }
  | { ok: false; errors: Partial<Record<Field, string>> };

/**
 * Turns what a shop typed into a clean https link to its Instagram, TikTok
 * or Facebook page, or null if it is anything else.
 */
export function normalizeSocialLink(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = `https://${raw}`;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (!SOCIAL_HOSTS.has(url.hostname)) return null;
  if (url.pathname === "/" || url.pathname === "") return null;

  url.protocol = "https:";
  return url.toString();
}

export function validateShopApplication(input: ShopApplicationInput): ApplicationResult {
  const errors: Partial<Record<Field, string>> = {};

  const displayName = input.displayName.trim();
  if (!displayName) errors.displayName = "ใส่ชื่อร้าน";
  else if (displayName.length > DISPLAY_NAME_MAX) errors.displayName = `ชื่อร้านยาวได้ไม่เกิน ${DISPLAY_NAME_MAX} ตัวอักษร`;

  const slug = validateSlug(input.slug);
  if (!slug.ok) errors.slug = slugErrorMessage(slug.error);

  if (!isProvince(input.province)) errors.province = "เลือกจังหวัดที่ร้านตั้งอยู่";

  const bio = input.bio.trim();
  if (bio.length > BIO_MAX) errors.bio = `คำอธิบายร้านยาวได้ไม่เกิน ${BIO_MAX} ตัวอักษร`;

  const styles = input.styles;
  if (styles.length === 0) errors.styles = "เลือกสไตล์ร้านอย่างน้อย 1 แบบ";
  else if (styles.length > MAX_STYLES) errors.styles = `เลือกสไตล์ได้ไม่เกิน ${MAX_STYLES} แบบ`;
  else if (new Set(styles).size !== styles.length) errors.styles = "เลือกสไตล์ซ้ำกัน";

  const rawLinks = input.socialLinks.map((l) => l.trim()).filter(Boolean);
  const socialLinks: string[] = [];
  if (rawLinks.length === 0) {
    errors.socialLinks = "ใส่ลิงก์ Instagram, TikTok หรือ Facebook ของร้านอย่างน้อย 1 ลิงก์";
  } else if (rawLinks.length > MAX_SOCIAL_LINKS) {
    errors.socialLinks = `ใส่ลิงก์ได้ไม่เกิน ${MAX_SOCIAL_LINKS} ลิงก์`;
  } else {
    for (const raw of rawLinks) {
      const link = normalizeSocialLink(raw);
      if (!link) {
        errors.socialLinks = `ลิงก์ ${raw} ใช้ไม่ได้ ใส่ลิงก์หน้าร้านใน Instagram, TikTok หรือ Facebook`;
        break;
      }
      if (socialLinks.includes(link)) {
        errors.socialLinks = "ใส่ลิงก์ซ้ำกัน";
        break;
      }
      socialLinks.push(link);
    }
  }

  if (Object.keys(errors).length > 0 || !slug.ok) return { ok: false, errors };

  return {
    ok: true,
    value: { displayName, slug: slug.slug, province: input.province, bio, styles, socialLinks },
  };
}
