import "server-only";
import { missingPhotos, type PhotoKind } from "@/lib/products/listing";
import { formatBaht, photoUrl } from "@/lib/search/results";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type MyShop = {
  id: string;
  slug: string;
  display_name: string;
  province: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
};

export type SellerItem = {
  id: string;
  title: string;
  price: string;
  size: string;
  status: string;
  photo: string | null;
  missing: PhotoKind[];
};

type ItemRow = {
  id: string;
  title: string;
  price_satang: number;
  size_label: string;
  status: string;
  has_flaws: boolean;
  product_images: { kind: string; storage_path: string }[] | null;
};

export function toSellerItem(row: ItemRow): SellerItem {
  const photos = row.product_images ?? [];
  const front = photos.find((p) => p.kind === "front");
  return {
    id: row.id,
    title: row.title,
    price: formatBaht(row.price_satang),
    size: row.size_label,
    status: row.status,
    photo: front ? photoUrl(supabaseEnv().url, front.storage_path) : null,
    missing: missingPhotos(photos.map((p) => p.kind as PhotoKind), row.has_flaws),
  };
}

/** The one action that moves an item along: photos, then publish, then sold. */
export function nextStep(status: string, missing: string[]): "ADD PHOTOS" | "PUBLISH" | "MARK SOLD" | null {
  if (status === "draft") return missing.length > 0 ? "ADD PHOTOS" : "PUBLISH";
  if (status === "active") return "MARK SOLD";
  return null;
}

export async function getMyShop(userId: string): Promise<MyShop | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("id, slug, display_name, province, status, rejection_reason")
    .eq("owner_id", userId)
    .maybeSingle();
  return (data as MyShop | null) ?? null;
}

export async function getMyItems(shopId: string): Promise<SellerItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, price_satang, size_label, status, has_flaws, product_images(kind, storage_path)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(300);
  return ((data as ItemRow[] | null) ?? []).map(toSellerItem);
}

export type EditableItem = {
  id: string;
  shopId: string;
  status: string;
  hasFlaws: boolean;
  values: {
    title: string;
    brand: string;
    description: string;
    category: string;
    sizeLabel: string;
    price: string;
    condition: string;
    hasFlaws: boolean;
    flawsNote: string;
    chest: string;
    length: string;
    shoulder: string;
    waist: string;
    styles: string[];
  };
  photos: { id: string; kind: PhotoKind; url: string }[];
};

const num = (v: number | null) => (v === null || v === undefined ? "" : String(Number(v)));

export async function getMyItem(productId: string): Promise<EditableItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, shop_id, status, title, brand, description, category, size_label, price_satang, condition, has_flaws, flaws_note, chest_cm, length_cm, shoulder_cm, waist_cm, product_images(id, kind, storage_path, position), product_styles(styles(slug))",
    )
    .eq("id", productId)
    .maybeSingle();
  if (!data) return null;
  const d = data as unknown as {
    id: string;
    shop_id: string;
    status: string;
    title: string;
    brand: string | null;
    description: string;
    category: string;
    size_label: string;
    price_satang: number;
    condition: string;
    has_flaws: boolean;
    flaws_note: string | null;
    chest_cm: number | null;
    length_cm: number | null;
    shoulder_cm: number | null;
    waist_cm: number | null;
    product_images: { id: string; kind: PhotoKind; storage_path: string; position: number }[] | null;
    product_styles: { styles: { slug: string } | null }[] | null;
  };
  const url = supabaseEnv().url;
  return {
    id: d.id,
    shopId: d.shop_id,
    status: d.status,
    hasFlaws: d.has_flaws,
    values: {
      title: d.title,
      brand: d.brand ?? "",
      description: d.description,
      category: d.category,
      sizeLabel: d.size_label,
      price: String(d.price_satang / 100),
      condition: d.condition,
      hasFlaws: d.has_flaws,
      flawsNote: d.flaws_note ?? "",
      chest: num(d.chest_cm),
      length: num(d.length_cm),
      shoulder: num(d.shoulder_cm),
      waist: num(d.waist_cm),
      styles: (d.product_styles ?? []).map((s) => s.styles?.slug).filter((s): s is string => Boolean(s)),
    },
    photos: (d.product_images ?? [])
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, kind: p.kind, url: photoUrl(url, p.storage_path) })),
  };
}
