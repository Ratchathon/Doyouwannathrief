// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/supabase/env", () => ({ supabaseEnv: () => ({ url: "https://x.supabase.co", publishableKey: "k" }) }));

const { toSellerItem, nextStep } = await import("@/lib/sell/shop-owner");

const row = (extra = {}) => ({
  id: "p1",
  title: "ยีนส์",
  price_satang: 129000,
  size_label: "32",
  status: "draft",
  has_flaws: false,
  product_images: [{ kind: "front", storage_path: "shop/p1/front.webp" }],
  ...extra,
});

describe("toSellerItem", () => {
  it("shows the front photo, the price and which photos are still missing", () => {
    expect(toSellerItem(row())).toMatchObject({
      id: "p1",
      price: "฿1,290",
      photo: "https://x.supabase.co/storage/v1/object/public/product-photos/shop/p1/front.webp",
      missing: ["back", "label"],
    });
  });

  it("asks for a flaw photo when the item has flaws", () => {
    expect(toSellerItem(row({ has_flaws: true })).missing).toEqual(["back", "label", "flaw"]);
  });
});

describe("nextStep", () => {
  it.each([
    ["draft", ["back"], "ADD PHOTOS"],
    ["draft", [], "PUBLISH"],
    ["active", [], "MARK SOLD"],
    ["reserved", [], null],
    ["sold", [], null],
  ])("a %s item missing %j suggests %s", (status, missing, step) => {
    expect(nextStep(status, missing as string[])).toBe(step);
  });
});
