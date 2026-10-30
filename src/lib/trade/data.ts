import "server-only";
import { formatBaht, photoUrl } from "@/lib/search/results";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Orders and offers as the pages show them. Every reader first ends anything past its deadline. */

export type OrderView = {
  id: string;
  status: "awaiting_payment" | "paid" | "shipped" | "completed" | "cancelled";
  price: string;
  priceSatang: number;
  payBy: string;
  tracking: string | null;
  createdAt: string;
  product: { id: string; title: string; photo: string | null; shopSlug: string; shopName: string };
};

export type OfferView = {
  id: string;
  status: string;
  amount: string;
  counter: string | null;
  counterRounds: number;
  respondBy: string | null;
  createdAt: string;
  product: { id: string; title: string; price: string; photo: string | null; shopSlug: string; shopName: string };
};

export type NotificationView = { id: string; kind: string; body: string; href: string; read: boolean; createdAt: string };

type ProductJoin = {
  id: string;
  title: string;
  price_satang: number;
  shops: { slug: string; display_name: string } | null;
  product_images: { kind: string; storage_path: string }[] | null;
};

const PRODUCT = "products(id, title, price_satang, shops(slug, display_name), product_images(kind, storage_path))";

function productOf(p: ProductJoin | null) {
  const front = p?.product_images?.find((i) => i.kind === "front");
  return {
    id: p?.id ?? "",
    title: p?.title ?? "",
    price: p ? formatBaht(p.price_satang) : "",
    photo: front ? photoUrl(supabaseEnv().url, front.storage_path) : null,
    shopSlug: p?.shops?.slug ?? "",
    shopName: p?.shops?.display_name ?? "",
  };
}

async function client() {
  const supabase = await createClient();
  await supabase.rpc("expire_stale");
  return supabase;
}

type OrderRow = {
  id: string;
  status: OrderView["status"];
  price_satang: number;
  pay_by: string;
  tracking_number: string | null;
  created_at: string;
  products: ProductJoin | null;
};

const toOrder = (o: OrderRow): OrderView => ({
  id: o.id,
  status: o.status,
  price: formatBaht(o.price_satang),
  priceSatang: o.price_satang,
  payBy: o.pay_by,
  tracking: o.tracking_number,
  createdAt: o.created_at,
  product: productOf(o.products),
});

const ORDER = `id, status, price_satang, pay_by, tracking_number, created_at, ${PRODUCT}`;

export async function getOrders(who: { buyer: string } | { shop: string }): Promise<OrderView[]> {
  const supabase = await client();
  let query = supabase.from("orders").select(ORDER).order("created_at", { ascending: false }).limit(100);
  query = "buyer" in who ? query.eq("buyer_id", who.buyer) : query.eq("shop_id", who.shop);
  const { data } = await query;
  return ((data as unknown as OrderRow[] | null) ?? []).map(toOrder);
}

export async function getOrder(orderId: string, buyerId: string): Promise<OrderView | null> {
  const supabase = await client();
  const { data } = await supabase.from("orders").select(ORDER).eq("id", orderId).eq("buyer_id", buyerId).maybeSingle();
  return data ? toOrder(data as unknown as OrderRow) : null;
}

type OfferRow = {
  id: string;
  status: string;
  amount_satang: number;
  counter_satang: number | null;
  counter_rounds: number;
  respond_by: string | null;
  created_at: string;
  products: ProductJoin | null;
};

const OFFER = `id, status, amount_satang, counter_satang, counter_rounds, respond_by, created_at, ${PRODUCT}`;

const toOffer = (o: OfferRow): OfferView => ({
  id: o.id,
  status: o.status,
  amount: formatBaht(o.amount_satang),
  counter: o.counter_satang ? formatBaht(o.counter_satang) : null,
  counterRounds: o.counter_rounds,
  respondBy: o.respond_by,
  createdAt: o.created_at,
  product: productOf(o.products),
});

export async function getBuyerOffers(buyerId: string): Promise<OfferView[]> {
  const supabase = await client();
  const { data } = await supabase.from("offers").select(OFFER).eq("buyer_id", buyerId).order("updated_at", { ascending: false }).limit(100);
  return ((data as unknown as OfferRow[] | null) ?? []).map(toOffer);
}

export async function getShopOffers(shopId: string): Promise<OfferView[]> {
  const supabase = await client();
  const { data } = await supabase
    .from("offers")
    .select(`id, status, amount_satang, counter_satang, counter_rounds, respond_by, created_at, products!inner(id, title, price_satang, shop_id, shops(slug, display_name), product_images(kind, storage_path))`)
    .eq("products.shop_id", shopId)
    .neq("status", "rejected")
    .order("updated_at", { ascending: false })
    .limit(100);
  return ((data as unknown as OfferRow[] | null) ?? []).map(toOffer);
}

export async function getNotifications(): Promise<NotificationView[]> {
  const supabase = await client();
  const { data } = await supabase.from("notifications").select("id, kind, body, href, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  return ((data as { id: string; kind: string; body: string; href: string; read_at: string | null; created_at: string }[] | null) ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    body: n.body,
    href: n.href,
    read: n.read_at !== null,
    createdAt: n.created_at,
  }));
}

export async function unreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}
