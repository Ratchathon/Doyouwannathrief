"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import {
  PHOTO_LABELS,
  missingPhotos,
  validateListing,
  type ListingInput,
  type PhotoKind,
} from "@/lib/products/listing";
import { createClient } from "@/lib/supabase/server";

export type ListingState = {
  error: string | null;
  saved?: boolean;
  fieldErrors?: Partial<Record<keyof ListingInput, string>>;
  values?: ListingInput;
};
export type SimpleState = { error: string | null };

const GENERIC_ERROR = "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";
const NOT_FOUND = "ไม่พบสินค้านี้ในร้านของคุณ";
const FROZEN = "สินค้าที่จองแล้วหรือขายแล้วแก้ไขไม่ได้";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function refresh() {
  revalidatePath("/sell/products");
}

export async function saveListing(_prev: ListingState | null, form: FormData): Promise<ListingState> {
  const userId = await requireUser("/sell/products");
  const supabase = await createClient();

  const { data: shop } = await supabase.from("shops").select("id, status").eq("owner_id", userId).maybeSingle();
  if (!shop) redirect("/sell/apply");
  if (shop.status !== "approved") return { error: "ร้านของคุณยังไม่ได้รับอนุมัติ ลงสินค้าได้หลังอนุมัติ" };

  const values: ListingInput = {
    title: text(form, "title"),
    brand: text(form, "brand"),
    description: text(form, "description"),
    category: text(form, "category"),
    sizeLabel: text(form, "sizeLabel"),
    price: text(form, "price"),
    condition: text(form, "condition"),
    hasFlaws: form.get("hasFlaws") === "on",
    flawsNote: text(form, "flawsNote"),
    chest: text(form, "chest"),
    length: text(form, "length"),
    shoulder: text(form, "shoulder"),
    waist: text(form, "waist"),
    styles: form.getAll("styles").filter((v): v is string => typeof v === "string"),
  };

  const result = validateListing(values);
  if (!result.ok) return { error: null, fieldErrors: result.errors, values };

  const item = result.value;
  const productId = text(form, "productId") || null;
  const { data: savedId, error } = await supabase.rpc("save_listing", {
    p_product_id: productId,
    p_shop_id: shop.id,
    p_title: item.title,
    p_brand: item.brand,
    p_description: item.description,
    p_category: item.category,
    p_size_label: item.sizeLabel,
    p_price_satang: item.priceSatang,
    p_condition: item.condition,
    p_has_flaws: item.hasFlaws,
    p_flaws_note: item.flawsNote,
    p_chest_cm: item.chestCm,
    p_length_cm: item.lengthCm,
    p_shoulder_cm: item.shoulderCm,
    p_waist_cm: item.waistCm,
    p_style_slugs: item.styles,
  });

  if (error?.code === "23514" && error.message?.includes("reserved or sold")) return { error: FROZEN, values };
  if (error?.code === "42501") return { error: NOT_FOUND, values };
  if (error || !savedId) return { error: GENERIC_ERROR, values };

  refresh();
  // A new item goes straight on to its photos; an edited one stays on its form.
  if (!productId) redirect(`/sell/products/${savedId}/photos`);
  return { error: null, saved: true };
}

export async function publishListing(_prev: SimpleState | null, form: FormData): Promise<SimpleState> {
  await requireUser("/sell/products");
  const productId = text(form, "productId");
  const supabase = await createClient();

  const { data: item } = await supabase.from("products").select("has_flaws").eq("id", productId).maybeSingle();
  if (!item) return { error: NOT_FOUND };

  const { data: photos } = await supabase.from("product_images").select("kind").eq("product_id", productId);
  const kinds = (photos ?? []).map((p: { kind: PhotoKind }) => p.kind);
  const missing = missingPhotos(kinds, item.has_flaws);
  if (missing.length > 0) return { error: `ยังขาดรูป: ${missing.map((k) => PHOTO_LABELS[k]).join(", ")}` };

  return changeStatus(productId, { status: "active" });
}

export async function unpublishListing(_prev: SimpleState | null, form: FormData): Promise<SimpleState> {
  await requireUser("/sell/products");
  return changeStatus(text(form, "productId"), { status: "draft" });
}

export async function markSold(_prev: SimpleState | null, form: FormData): Promise<SimpleState> {
  await requireUser("/sell/products");
  return changeStatus(text(form, "productId"), { status: "sold", sold_at: new Date().toISOString() });
}

async function changeStatus(productId: string, values: Record<string, string>): Promise<SimpleState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").update(values).eq("id", productId).select("id");

  if (error?.code === "23514") return { error: "เปลี่ยนสถานะนี้ไม่ได้ ตรวจรูปและสถานะสินค้าอีกครั้ง" };
  if (error) return { error: GENERIC_ERROR };
  if (!data || data.length === 0) return { error: NOT_FOUND };

  refresh();
  return { error: null };
}

export async function deleteListing(_prev: SimpleState | null, form: FormData): Promise<SimpleState> {
  await requireUser("/sell/products");
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").delete().eq("id", text(form, "productId")).select("id");

  if (error?.code === "23503") {
    return { error: "ลบไม่ได้ เพราะสินค้านี้มีคนแจ้งปัญหาไว้ ต้องเก็บไว้ให้แอดมินตรวจสอบ ซ่อนสินค้าแทนได้" };
  }
  if (error) return { error: GENERIC_ERROR };
  if (!data || data.length === 0) return { error: NOT_FOUND };

  refresh();
  redirect("/sell/products");
}
