import { CATEGORIES, parseBaht, type Category } from "@/lib/products/listing";
import { isProvince } from "@/lib/shops/provinces";

export const PAGE_SIZE = 24;
const MAX_PAGE = 100;
const QUERY_MAX = 100;
const SIZE_MAX = 20;
const SORTS = new Set(["newest", "price_asc", "price_desc"]);

export type ItemSort = "newest" | "price_asc" | "price_desc";

export type ItemSearchArgs = {
  p_query: string | null;
  p_category: Category | null;
  p_style: string | null;
  p_province: string | null;
  p_min_satang: number | null;
  p_max_satang: number | null;
  p_size: string | null;
  p_sort: ItemSort;
  p_limit: number;
  p_offset: number;
  /** Any of these categories (from the URL, comma separated). */
  p_categories: Category[] | null;
  /** Any of these sizes, compared without regard to case. */
  p_sizes: string[] | null;
};

export type ShopSearchArgs = Pick<ItemSearchArgs, "p_query" | "p_style" | "p_province" | "p_limit" | "p_offset">;

function query(params: URLSearchParams): string | null {
  const text = (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, QUERY_MAX);
  return text || null;
}

function style(params: URLSearchParams): string | null {
  const value = params.get("style") ?? "";
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) ? value : null;
}

function province(params: URLSearchParams): string | null {
  const value = params.get("province") ?? "";
  return isProvince(value) ? value : null;
}

function offset(params: URLSearchParams): number {
  const raw = params.get("page") ?? "1";
  const page = /^\d+$/.test(raw) ? Number(raw) : 1;
  const clamped = Math.min(Math.max(page, 1), MAX_PAGE);
  return (clamped - 1) * PAGE_SIZE;
}

const MAX_VALUES = 12;

/** Comma-separated values, trimmed, without repeats (case-insensitive). */
export function listParam(params: URLSearchParams, key: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of (params.get(key) ?? "").split(",")) {
    const value = raw.trim();
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    out.push(value);
  }
  return out;
}

/** Reads Discover's item filters from the URL. Anything invalid falls back to its default. */
export function parseItemSearch(params: URLSearchParams): ItemSearchArgs {
  const sort = params.get("sort") ?? "";
  const categories = listParam(params, "category")
    .filter((c): c is Category => Object.hasOwn(CATEGORIES, c))
    .slice(0, MAX_VALUES);
  const sizes = listParam(params, "size")
    .filter((s) => s.length <= SIZE_MAX)
    .slice(0, MAX_VALUES);

  let min = parseBaht(params.get("min") ?? "");
  let max = parseBaht(params.get("max") ?? "");
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  return {
    p_query: query(params),
    p_category: null,
    p_style: style(params),
    p_province: province(params),
    p_min_satang: min,
    p_max_satang: max,
    p_size: null,
    p_sort: SORTS.has(sort) ? (sort as ItemSort) : "newest",
    p_limit: PAGE_SIZE,
    p_offset: offset(params),
    p_categories: categories.length > 0 ? categories : null,
    p_sizes: sizes.length > 0 ? sizes : null,
  };
}

/** Reads Discover's shop filters from the URL. */
export function parseShopSearch(params: URLSearchParams): ShopSearchArgs {
  return {
    p_query: query(params),
    p_style: style(params),
    p_province: province(params),
    p_limit: PAGE_SIZE,
    p_offset: offset(params),
  };
}
