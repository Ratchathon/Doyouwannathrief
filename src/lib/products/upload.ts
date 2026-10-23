"use client";

import type { PhotoKind } from "@/lib/products/listing";
import { PHOTO_BUCKET, PHOTO_MAX_EDGE, PHOTO_QUALITY, checkPhotoFile, fitWithin, photoPath } from "@/lib/products/photos";
import { attachPhoto } from "@/lib/products/photo-actions";
import { createClient } from "@/lib/supabase/client";

/**
 * Shrinks a photo and re-encodes it as WebP in the browser. Drawing onto a
 * canvas keeps only pixels, so location and camera data are left behind.
 * `imageOrientation: "from-image"` applies the phone's rotation first.
 */
export async function prepareForUpload(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not available");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", PHOTO_QUALITY));
  if (!blob || blob.type !== "image/webp") throw new Error("This browser cannot save WebP");
  return blob;
}

/** Checks, shrinks, uploads and records one photo. Returns a Thai error or null. */
export async function uploadPhoto(input: {
  file: File;
  shopId: string;
  productId: string;
  kind: PhotoKind;
}): Promise<string | null> {
  const check = checkPhotoFile(input.file);
  if (!check.ok) return check.error;

  let blob: Blob;
  try {
    blob = await prepareForUpload(input.file);
  } catch {
    return "เปิดรูปนี้ไม่ได้ ลองถ่ายใหม่ หรือเลือกรูปแบบ JPG";
  }

  const path = photoPath(input.shopId, input.productId, input.kind);
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/webp", upsert: false });
  if (error) return "อัปโหลดไม่สำเร็จ ตรวจสัญญาณเน็ตแล้วลองใหม่";

  const result = await attachPhoto({ productId: input.productId, path });
  return result.error;
}
