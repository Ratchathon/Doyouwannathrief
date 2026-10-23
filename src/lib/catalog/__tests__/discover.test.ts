// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/lib/supabase/env", () => ({ supabaseEnv: () => ({ url: "https://x.supabase.co", publishableKey: "k" }) }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ rpc }) }));
vi.mock("@/lib/catalog/home", () => ({ getHomeShops: async () => [{ slug: "s", display_name: "S", province: "p", style: null }] }));

const { getDiscover } = await import("@/lib/catalog/discover");

const row = (id: string, extra = {}) => ({
  id, title: id, brand: null, price_satang: 1000, size_label: "M", status: "active",
  shop_slug: "s", shop_name: "S", front_path: `samples/s/${id}.webp`, ...extra,
});

beforeEach(() => {
  rpc.mockReset().mockImplementation(async (name: string) => {
    if (name === "trending_products") return { data: [row("t", { views: 9 })], error: null };
    return { data: [row(name)], error: null };
  });
});

describe("getDiscover", () => {
  it("asks for trending, newest, nearby and cheap items", async () => {
    const data = await getDiscover("เชียงใหม่");
    expect(rpc).toHaveBeenCalledWith("trending_products", { p_days: 7, p_min_views: 3, p_limit: 12 });
    expect(rpc).toHaveBeenCalledWith("search_products", expect.objectContaining({ p_sort: "newest", p_limit: 12 }));
    expect(rpc).toHaveBeenCalledWith("search_products", expect.objectContaining({ p_province: "เชียงใหม่", p_limit: 12 }));
    expect(rpc).toHaveBeenCalledWith("search_products", expect.objectContaining({ p_max_satang: 50000, p_limit: 12 }));
    expect(data.trending).toEqual([expect.objectContaining({ id: "t", views: 9, photo: "/samples/s/t.webp" })]);
    expect(data.shops).toHaveLength(1);
    expect(data.province).toBe("เชียงใหม่");
  });

  it("skips the nearby query without a province", async () => {
    const data = await getDiscover(null);
    expect(rpc).not.toHaveBeenCalledWith("search_products", expect.objectContaining({ p_province: expect.anything() }));
    expect(data.near).toEqual([]);
  });

  it("returns empty rows when the database fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    const data = await getDiscover(null);
    expect(data.trending).toEqual([]);
    expect(data.dropped).toEqual([]);
  });
});
