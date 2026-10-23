// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const results: Record<string, { data: unknown; error: unknown }> = {};
const calls: Record<string, unknown[][]> = {};

function query(table: string) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit"]) {
    chain[m] = (...args: unknown[]) => {
      (calls[table] ??= []).push([m, ...args]);
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(results[table]);
  return chain;
}

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ from: query }) }));

const { getNavData } = await import("@/lib/catalog/nav");

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k];
  results.styles = { data: [{ slug: "vintage", name_en: "Vintage" }], error: null };
  results.shops = { data: [{ slug: "tuekdaeng", display_name: "TUEKDAENG VINTAGE", province: "กรุงเทพมหานคร" }], error: null };
});

describe("getNavData", () => {
  it("returns styles in order and the newest approved shops", async () => {
    expect(await getNavData()).toEqual({
      styles: [{ slug: "vintage", name_en: "Vintage" }],
      shops: [{ slug: "tuekdaeng", display_name: "TUEKDAENG VINTAGE", province: "กรุงเทพมหานคร" }],
    });
    expect(calls.styles).toContainEqual(["order", "position"]);
    expect(calls.shops).toContainEqual(["eq", "status", "approved"]);
    expect(calls.shops).toContainEqual(["order", "approved_at", { ascending: false }]);
    expect(calls.shops).toContainEqual(["limit", 8]);
  });

  it("falls back to empty lists so the header still renders when the database is down", async () => {
    results.styles = { data: null, error: { message: "down" } };
    results.shops = { data: null, error: { message: "down" } };
    expect(await getNavData()).toEqual({ styles: [], shops: [] });
  });
});
