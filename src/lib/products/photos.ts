import type { PhotoKind } from "@/lib/products/listing";

/** Storage bucket holding item photos. Created in the storage migration. */
export const PHOTO_BUCKET = "product-photos";

/**
 * Photos are shrunk and re-encoded as WebP in the browser before upload.
 * Re-encoding also drops embedded data such as the GPS location a phone
 * writes into every photo.
 */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// HEIC/HEIF is what iPhones save by default.
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export function checkPhotoFile(file: { type: string; size: number }): { ok: true } | { ok: false; error: string } {
  if (!ACCEPTED_TYPES.has(file.type)) return { ok: false, error: "ใช้ได้เฉพาะไฟล์รูป JPG, PNG, WebP หรือ HEIC" };
  if (file.size === 0) return { ok: false, error: "ไฟล์นี้ว่างเปล่า ลองเลือกรูปใหม่" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "รูปใหญ่เกิน 20MB ลองถ่ายใหม่หรือเลือกรูปอื่น" };
  return { ok: true };
}

/** Size that fits inside a square of `maxEdge`, keeping the shape and never enlarging. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const KINDS = "front|back|label|flaw|extra";
const PATH_PATTERN = new RegExp(`^(${UUID})/(${UUID})/(${KINDS})-${UUID}\\.webp$`);

/**
 * Where a photo lives in storage: `<shop>/<item>/<kind>-<random>.webp`.
 * The shop folder is what the storage access rules check; the random part
 * means a replaced photo gets a new URL, so no browser shows a stale copy.
 */
export function photoPath(shopId: string, productId: string, kind: PhotoKind): string {
  return `${shopId}/${productId}/${kind}-${crypto.randomUUID()}.webp`;
}

export function parsePhotoPath(path: string): { shopId: string; productId: string; kind: PhotoKind } | null {
  const match = PATH_PATTERN.exec(path);
  if (!match) return null;
  return { shopId: match[1], productId: match[2], kind: match[3] as PhotoKind };
}
