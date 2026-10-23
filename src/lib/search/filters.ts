import { CATEGORIES, type Category } from "@/lib/products/listing";
import { isProvince } from "@/lib/shops/provinces";
import type { ResultsScope } from "@/lib/search/results";

/** Quick price ranges in baht (null = open-ended). */
export const PRICE_PRESETS: { min: number | null; max: number | null }[] = [
  { min: null, max: 500 },
  { min: 500, max: 1000 },
  { min: 1000, max: 2000 },
  { min: 2000, max: null },
];

const baht = new Intl.NumberFormat("en-US");

export function priceLabel(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return `฿${baht.format(min)}–${baht.format(max)}`;
  if (max !== null) return `ต่ำกว่า ฿${baht.format(max)}`;
  if (min !== null) return `เกิน ฿${baht.format(min)}`;
  return null;
}

function toHref(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** URL with the given filters set (or removed when null), back on page 1. */
export function filterHref(path: string, params: URLSearchParams, changes: Record<string, string | null>): string {
  const next = new URLSearchParams(params);
  next.delete("page");
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
  }
  return toHref(path, next);
}

export function clearHref(path: string, params: URLSearchParams): string {
  const next = new URLSearchParams();
  for (const key of ["q", "sort"]) {
    const value = params.get(key);
    if (value) next.set(key, value);
  }
  return toHref(path, next);
}

export function readBaht(value: string | null): number | null {
  return value && /^\d{1,7}$/.test(value) ? Number(value) : null;
}

export type ActiveFilter = { key: string; label: string; removeHref: string };

/** Filters currently applied, each with a link that removes it. A category page's own category is fixed. */
export function activeFilters(path: string, params: URLSearchParams, scope: ResultsScope["kind"]): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  const category = params.get("category") ?? "";
  if (scope !== "category" && Object.hasOwn(CATEGORIES, category)) {
    out.push({ key: "category", label: CATEGORIES[category as Category].en, removeHref: filterHref(path, params, { category: null }) });
  }
  const size = (params.get("size") ?? "").trim();
  if (size && size.length <= 20) {
    out.push({ key: "size", label: `SIZE ${size}`, removeHref: filterHref(path, params, { size: null }) });
  }
  const price = priceLabel(readBaht(params.get("min")), readBaht(params.get("max")));
  if (price) out.push({ key: "price", label: price, removeHref: filterHref(path, params, { min: null, max: null }) });
  const province = params.get("province") ?? "";
  if (isProvince(province)) {
    out.push({ key: "province", label: province, removeHref: filterHref(path, params, { province: null }) });
  }
  return out;
}
