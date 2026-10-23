import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { ResultItem } from "@/components/results-view";
import { CATEGORIES, CONDITIONS, MEASUREMENT_LABELS, type Category, type Measurement } from "@/lib/products/listing";
import type { ItemSort } from "@/lib/search/params";
import { photoUrl } from "@/lib/search/results";
import { supabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

const SHOP_ITEM_LIMIT = 120;
const SORTS: ItemSort[] = ["newest", "price_asc", "price_desc"];
const PHOTO_ORDER = ["front", "back", "label", "flaw", "extra"];

export type CategoryCount = { value: Category; en: string; n: number };

export function categoryCounts(categories: string[]): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  return (Object.keys(CATEGORIES) as Category[])
    .filter((value) => counts.has(value))
    .map((value) => ({ value, en: CATEGORIES[value].en, n: counts.get(value)! }));
}

export function socialPlatform(url: string): "Instagram" | "TikTok" | "Facebook" | null {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return "";
    }
  })();
  if (/(^|\.)instagram\.com$/.test(host)) return "Instagram";
  if (/(^|\.)tiktok\.com$/.test(host)) return "TikTok";
  if (/(^|\.)facebook\.com$/.test(host)) return "Facebook";
  return null;
}

export function shopArgs(params: URLSearchParams): { category: Category | null; sort: ItemSort } {
  const category = params.get("category") ?? "";
  const sort = params.get("sort") ?? "";
  return {
    category: Object.hasOwn(CATEGORIES, category) ? (category as Category) : null,
    sort: (SORTS as string[]).includes(sort) ? (sort as ItemSort) : "newest",
  };
}

// ---------------------------------------------------------------------------
// Shop page
// ---------------------------------------------------------------------------

type StyleRef = { slug: string; name_en: string; position: number } | null;

export type ShopPage = {
  shop: {
    slug: string;
    name: string;
    province: string;
    bio: string;
    social: { url: string; platform: "Instagram" | "TikTok" | "Facebook" }[];
    styles: { slug: string; en: string }[];
  };
  items: ResultItem[];
  categories: CategoryCount[];
  forSale: number;
  sold: number;
};

function styleList(refs: { styles: StyleRef }[] | null): { slug: string; en: string }[] {
  return (refs ?? [])
    .map((r) => r.styles)
    .filter((s): s is NonNullable<StyleRef> => s !== null)
    .sort((a, b) => a.position - b.position)
    .map((s) => ({ slug: s.slug, en: s.name_en.toUpperCase() }));
}

/** An approved shop and its items for sale, or null if there is no such shop. */
export async function getShopPage(slug: string, category: Category | null, sort: ItemSort): Promise<ShopPage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("shops", "products");
  const supabase = createPublicClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("id, slug, display_name, province, bio, social_links, shop_styles(styles(slug, name_en, position))")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (!shop) return null;

  let itemQuery = supabase
    .from("products")
    .select("id, title, brand, price_satang, size_label, status, product_images(kind, storage_path)")
    .eq("shop_id", shop.id)
    .in("status", ["active", "reserved"]);
  if (category) itemQuery = itemQuery.eq("category", category);
  itemQuery =
    sort === "newest"
      ? itemQuery.order("created_at", { ascending: false })
      : itemQuery.order("price_satang", { ascending: sort === "price_asc" });

  const [items, cats, sold] = await Promise.all([
    itemQuery.limit(SHOP_ITEM_LIMIT),
    supabase.from("products").select("category").eq("shop_id", shop.id).in("status", ["active", "reserved"]),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "sold"),
  ]);

  const { url } = supabaseEnv();
  type ItemRow = Omit<ResultItem, "photo" | "shop_slug" | "shop_name"> & {
    product_images: { kind: string; storage_path: string }[] | null;
  };
  const categoryRows = (cats.data ?? []) as { category: string }[];

  return {
    shop: {
      slug: shop.slug,
      name: shop.display_name,
      province: shop.province,
      bio: shop.bio ?? "",
      social: ((shop.social_links ?? []) as string[]).flatMap((link) => {
        const platform = socialPlatform(link);
        return platform ? [{ url: link, platform }] : [];
      }),
      styles: styleList(shop.shop_styles as unknown as { styles: StyleRef }[]),
    },
    items: ((items.data ?? []) as unknown as ItemRow[]).map((row) => {
      const front = row.product_images?.find((p) => p.kind === "front");
      return {
        id: row.id,
        title: row.title,
        brand: row.brand,
        price_satang: row.price_satang,
        size_label: row.size_label,
        status: row.status,
        shop_slug: shop.slug,
        shop_name: shop.display_name,
        photo: front ? photoUrl(url, front.storage_path) : null,
      };
    }),
    categories: categoryCounts(categoryRows.map((r) => r.category)),
    forSale: categoryRows.length,
    sold: sold.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Product page
// ---------------------------------------------------------------------------

export type ProductPage = {
  id: string;
  title: string;
  brand: string | null;
  description: string;
  category: { value: Category; en: string };
  sizeLabel: string;
  priceSatang: number;
  conditionLabel: string;
  flawsNote: string | null;
  measurements: { label: string; cm: number }[];
  status: string;
  shop: { slug: string; name: string; province: string };
  photos: { kind: string; url: string }[];
  styles: { slug: string; en: string }[];
};

type ProductRow = {
  id: string;
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
  status: string;
  shops: { slug: string; display_name: string; province: string };
  product_images: { kind: string; storage_path: string; position: number }[] | null;
  product_styles: { styles: StyleRef }[] | null;
};

export function toProductPage(row: ProductRow, supabaseUrl: string): ProductPage {
  const category = row.category as Category;
  const measurements = (["chest", "length", "shoulder", "waist"] as Measurement[]).flatMap((m) => {
    const cm = row[`${m}_cm` as const];
    return cm === null || cm === undefined ? [] : [{ label: MEASUREMENT_LABELS[m], cm: Number(cm) }];
  });
  const photos = [...(row.product_images ?? [])]
    .sort((a, b) => PHOTO_ORDER.indexOf(a.kind) - PHOTO_ORDER.indexOf(b.kind) || a.position - b.position)
    .map((p) => ({ kind: p.kind, url: photoUrl(supabaseUrl, p.storage_path) }));
  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    description: row.description,
    category: { value: category, en: CATEGORIES[category]?.en ?? category.toUpperCase() },
    sizeLabel: row.size_label,
    priceSatang: row.price_satang,
    conditionLabel: CONDITIONS[row.condition as keyof typeof CONDITIONS] ?? row.condition,
    flawsNote: row.has_flaws ? row.flaws_note : null,
    measurements,
    status: row.status,
    shop: { slug: row.shops.slug, name: row.shops.display_name, province: row.shops.province },
    photos,
    styles: styleList(row.product_styles),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A visible item of the given shop, or null. */
export async function getProductPage(shopSlug: string, id: string): Promise<ProductPage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  if (!UUID.test(id)) return null;
  const { data } = await createPublicClient()
    .from("products")
    .select(
      "id, title, brand, description, category, size_label, price_satang, condition, has_flaws, flaws_note, " +
        "chest_cm, length_cm, shoulder_cm, waist_cm, status, shops!inner(slug, display_name, province), " +
        "product_images(kind, storage_path, position), product_styles(styles(slug, name_en, position))",
    )
    .eq("id", id)
    .eq("shops.slug", shopSlug)
    .maybeSingle();
  if (!data) return null;
  return toProductPage(data as unknown as ProductRow, supabaseEnv().url);
}
