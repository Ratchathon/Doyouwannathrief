// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A tiny stand-in for the Supabase query builder: every chained call is
 * recorded, and awaiting the chain resolves to the result queued for that table.
 */
type Result = { data: unknown; error: unknown };
const results = new Map<string, Result[]>();
const calls: { table: string; chain: [string, unknown[]][] }[] = [];

function queue(table: string, result: Result) {
  results.set(table, [...(results.get(table) ?? []), result]);
}

function from(table: string) {
  const entry = { table, chain: [] as [string, unknown[]][] };
  calls.push(entry);
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "insert", "update", "delete", "eq", "in", "order", "limit"]) {
    builder[method] = (...args: unknown[]) => {
      entry.chain.push([method, args]);
      return builder;
    };
  }
  const resolve = () => results.get(table)?.shift() ?? { data: null, error: null };
  builder.maybeSingle = async () => resolve();
  builder.single = async () => resolve();
  builder.then = (onFulfilled: (r: Result) => unknown) => Promise.resolve(resolve()).then(onFulfilled);
  return builder;
}

const rpc = vi.fn();
const revalidatePath = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from, rpc }) }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: async () => "user-1" }));

class Signal extends Error {
  constructor(public to: string) {
    super(to);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Signal(to);
  },
}));

const { deleteListing, markSold, publishListing, saveListing, unpublishListing } = await import(
  "@/lib/products/actions"
);

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const item of Array.isArray(v) ? v : [v]) data.append(k, item);
  return data;
}

async function redirectOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (e) {
    if (e instanceof Signal) return e.to;
    throw e;
  }
  throw new Error("expected redirect");
}

const listingForm = {
  title: "เสื้อเชิ้ตเดนิม",
  brand: "Levi's",
  description: "",
  category: "tops",
  sizeLabel: "L",
  price: "1,290",
  condition: "good",
  flawsNote: "",
  chest: "58",
  length: "74",
  shoulder: "50",
  waist: "",
  styles: ["vintage"],
};

const approvedShop = { data: { id: "shop-1", status: "approved" }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  results.clear();
  calls.length = 0;
});

describe("saveListing", () => {
  it("asks shops that are not approved yet to wait", async () => {
    queue("shops", { data: { id: "shop-1", status: "pending" }, error: null });
    const state = await saveListing(null, form(listingForm));
    expect(state.error).toMatch(/อนุมัติ/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends people without a shop to the application", async () => {
    queue("shops", { data: null, error: null });
    expect(await redirectOf(saveListing(null, form(listingForm)))).toBe("/sell/apply");
  });

  it("returns field errors without saving", async () => {
    queue("shops", approvedShop);
    const state = await saveListing(null, form({ ...listingForm, price: "free" }));
    expect(state.fieldErrors?.price).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reads the flaws checkbox", async () => {
    queue("shops", approvedShop);
    const state = await saveListing(null, form({ ...listingForm, hasFlaws: "on" }));
    expect(state.fieldErrors?.flawsNote).toBeTruthy();
  });

  it("saves a new draft and continues to its photos", async () => {
    queue("shops", approvedShop);
    rpc.mockResolvedValue({ data: "item-9", error: null });
    expect(await redirectOf(saveListing(null, form(listingForm)))).toBe("/sell/products/item-9/photos");
    expect(rpc).toHaveBeenCalledWith(
      "save_listing",
      expect.objectContaining({
        p_product_id: null,
        p_shop_id: "shop-1",
        p_price_satang: 129000,
        p_brand: "Levi's",
        p_has_flaws: false,
        p_chest_cm: 58,
        p_waist_cm: null,
        p_style_slugs: ["vintage"],
      }),
    );
  });

  it("updates an existing item and refreshes its pages", async () => {
    queue("shops", approvedShop);
    rpc.mockResolvedValue({ data: "item-1", error: null });
    const state = await saveListing(null, form({ ...listingForm, productId: "item-1" }));
    expect(state).toEqual({ error: null, saved: true });
    expect(rpc).toHaveBeenCalledWith("save_listing", expect.objectContaining({ p_product_id: "item-1" }));
    expect(revalidatePath).toHaveBeenCalledWith("/sell/products");
  });

  it("explains that reserved or sold items are frozen", async () => {
    queue("shops", approvedShop);
    rpc.mockResolvedValue({ data: null, error: { code: "23514", message: "A reserved or sold item cannot be edited" } });
    const state = await saveListing(null, form({ ...listingForm, productId: "item-1" }));
    expect(state.error).toMatch(/จอง|ขาย/);
  });
});

describe("publishListing", () => {
  it("names the photos still missing, in Thai", async () => {
    queue("products", { data: { has_flaws: true }, error: null });
    queue("product_images", { data: [{ kind: "front" }], error: null });
    const state = await publishListing(null, form({ productId: "item-1" }));
    expect(state.error).toBe("ยังขาดรูป: ด้านหลัง, ป้ายแบรนด์/ป้ายคอ, ตำหนิ");
  });

  it("puts a complete item on sale", async () => {
    queue("products", { data: { has_flaws: false }, error: null });
    queue("product_images", { data: [{ kind: "front" }, { kind: "back" }, { kind: "label" }], error: null });
    queue("products", { data: [{ id: "item-1" }], error: null });
    const state = await publishListing(null, form({ productId: "item-1" }));
    expect(state).toEqual({ error: null });
    const update = calls.find((c) => c.table === "products" && c.chain.some(([m]) => m === "update"));
    expect(update?.chain).toContainEqual(["update", [{ status: "active" }]]);
  });

  it("reports an item that does not exist or is not yours", async () => {
    queue("products", { data: null, error: null });
    const state = await publishListing(null, form({ productId: "item-x" }));
    expect(state.error).toMatch(/ไม่พบ/);
  });
});

describe("status changes", () => {
  it("takes an item off sale", async () => {
    queue("products", { data: [{ id: "item-1" }], error: null });
    expect(await unpublishListing(null, form({ productId: "item-1" }))).toEqual({ error: null });
  });

  it("marks an item sold with a timestamp", async () => {
    queue("products", { data: [{ id: "item-1" }], error: null });
    expect(await markSold(null, form({ productId: "item-1" }))).toEqual({ error: null });
    const update = calls.find((c) => c.chain.some(([m]) => m === "update"));
    const [, [values]] = update!.chain.find(([m]) => m === "update")!;
    expect(values).toMatchObject({ status: "sold" });
    expect((values as { sold_at: string }).sold_at).toMatch(/^\d{4}-/);
  });

  it("reports when nothing was changed", async () => {
    queue("products", { data: [], error: null });
    expect((await markSold(null, form({ productId: "item-x" }))).error).toMatch(/ไม่พบ/);
  });
});

describe("deleteListing", () => {
  it("deletes and returns to the item list", async () => {
    queue("products", { data: [{ id: "item-1" }], error: null });
    expect(await redirectOf(deleteListing(null, form({ productId: "item-1" })))).toBe("/sell/products");
  });

  it("explains that reported items are kept", async () => {
    queue("products", { data: null, error: { code: "23503", message: "reports_product_id_fkey" } });
    const state = await deleteListing(null, form({ productId: "item-1" }));
    expect(state.error).toMatch(/แจ้งปัญหา/);
  });
});
