"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import type { PhotoKind } from "@/lib/products/listing";
import { PHOTO_BUCKET, parsePhotoPath } from "@/lib/products/photos";
import { createClient } from "@/lib/supabase/server";

export type PhotoState = { error: string | null };

// One of each per item; uploading again replaces the old one.
const SINGLE_KINDS = new Set<PhotoKind>(["front", "back", "label"]);
const SAVE_FAILED = "บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้ง";

/**
 * Records a photo the browser has just uploaded to storage. A front, back
 * or label photo replaces the previous one, whose file is then deleted.
 */
export async function attachPhoto(input: { productId: string; path: string }): Promise<PhotoState> {
  await requireUser("/sell/products");

  const parsed = parsePhotoPath(input.path);
  if (!parsed || parsed.productId !== input.productId) return { error: "รูปนี้ไม่ตรงกับสินค้า ลองอัปโหลดใหม่" };

  const supabase = await createClient();
  const files = supabase.storage.from(PHOTO_BUCKET);
  let replacedPath: string | null = null;
  let error: unknown = null;

  if (SINGLE_KINDS.has(parsed.kind)) {
    const { data: existing } = await supabase
      .from("product_images")
      .select("id, storage_path")
      .eq("product_id", input.productId)
      .eq("kind", parsed.kind)
      .maybeSingle();

    if (existing) {
      const result = await supabase
        .from("product_images")
        .update({ storage_path: input.path })
        .eq("id", existing.id)
        .select("id");
      error = result.error ?? (result.data?.length ? null : "not found");
      replacedPath = existing.storage_path;
    } else {
      ({ error } = await insertPhoto(supabase, input.productId, parsed.kind, input.path));
    }
  } else {
    ({ error } = await insertPhoto(supabase, input.productId, parsed.kind, input.path));
  }

  if (error) {
    // Do not leave an orphaned file behind.
    await files.remove([input.path]);
    return { error: SAVE_FAILED };
  }

  if (replacedPath) await files.remove([replacedPath]);
  revalidatePath(`/sell/products/${input.productId}/photos`);
  return { error: null };
}

async function insertPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  kind: PhotoKind,
  path: string,
) {
  return supabase
    .from("product_images")
    .insert({ product_id: productId, kind, storage_path: path })
    .select("id")
    .single();
}

export async function removePhoto(input: { photoId: string }): Promise<PhotoState> {
  await requireUser("/sell/products");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", input.photoId)
    .select("storage_path");

  if (error?.code === "23514") {
    return { error: "รูปบังคับของสินค้าที่กำลังขายลบไม่ได้ ใช้ปุ่มเปลี่ยนรูปแทน" };
  }
  if (error) return { error: "ลบรูปไม่สำเร็จ ลองใหม่อีกครั้ง" };
  if (!data || data.length === 0) return { error: "ไม่พบรูปนี้ในร้านของคุณ" };

  await supabase.storage.from(PHOTO_BUCKET).remove(data.map((row: { storage_path: string }) => row.storage_path));
  revalidatePath("/sell/products");
  return { error: null };
}
