// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: unknown };
const results = new Map<string, Result[]>();
const calls: { table: string; chain: [string, unknown[]][] }[] = [];
const queue = (table: string, result: Result) => results.set(table, [...(results.get(table) ?? []), result]);

function from(table: string) {
  const entry = { table, chain: [] as [string, unknown[]][] };
  calls.push(entry);
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "in"]) {
    builder[m] = (...args: unknown[]) => {
      entry.chain.push([m, args]);
      return builder;
    };
  }
  const resolve = () => results.get(table)?.shift() ?? { data: null, error: null };
  builder.maybeSingle = async () => resolve();
  builder.single = async () => resolve();
  builder.then = (ok: (r: Result) => unknown) => Promise.resolve(resolve()).then(ok);
  return builder;
}

const remove = vi.fn();
const storage = { from: vi.fn(() => ({ remove })) };
const revalidatePath = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from, storage }) }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: async () => "user-1" }));

const { attachPhoto, removePhoto } = await import("@/lib/products/photo-actions");

const SHOP = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const pathFor = (kind: string) => `${SHOP}/${ITEM}/${kind}-${crypto.randomUUID()}.webp`;

beforeEach(() => {
  vi.clearAllMocks();
  results.clear();
  calls.length = 0;
  remove.mockResolvedValue({ data: [], error: null });
});

const updates = () => calls.filter((c) => c.chain.some(([m]) => m === "update"));
const inserts = () => calls.filter((c) => c.chain.some(([m]) => m === "insert"));

describe("attachPhoto", () => {
  it("refuses a path that does not belong to the item", async () => {
    const other = "33333333-3333-4333-8333-333333333333";
    const state = await attachPhoto({ productId: other, path: pathFor("front") });
    expect(state.error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it("refuses a made-up path", async () => {
    const state = await attachPhoto({ productId: ITEM, path: "../../secrets.webp" });
    expect(state.error).toBeTruthy();
  });

  it("adds a new front photo", async () => {
    queue("product_images", { data: null, error: null }); // no existing front
    queue("product_images", { data: { id: "img-1" }, error: null }); // insert
    const path = pathFor("front");
    expect(await attachPhoto({ productId: ITEM, path })).toEqual({ error: null });
    expect(inserts()[0].chain).toContainEqual(["insert", [{ product_id: ITEM, kind: "front", storage_path: path }]]);
    expect(remove).not.toHaveBeenCalled();
  });

  it("replaces an existing front photo and deletes the old file", async () => {
    queue("product_images", { data: { id: "img-1", storage_path: "old/front.webp" }, error: null });
    queue("product_images", { data: [{ id: "img-1" }], error: null }); // update
    const path = pathFor("front");
    expect(await attachPhoto({ productId: ITEM, path })).toEqual({ error: null });
    expect(updates()[0].chain).toContainEqual(["update", [{ storage_path: path }]]);
    expect(storage.from).toHaveBeenCalledWith("product-photos");
    expect(remove).toHaveBeenCalledWith(["old/front.webp"]);
  });

  it("always adds flaw and extra photos alongside the others", async () => {
    queue("product_images", { data: { id: "img-9" }, error: null });
    await attachPhoto({ productId: ITEM, path: pathFor("flaw") });
    expect(inserts()).toHaveLength(1);
    expect(calls.filter((c) => c.chain.some(([m]) => m === "maybeSingle"))).toHaveLength(0);
  });

  it("cleans up the uploaded file if saving the record fails", async () => {
    queue("product_images", { data: null, error: { code: "42501", message: "rls" } });
    const path = pathFor("extra");
    const state = await attachPhoto({ productId: ITEM, path });
    expect(state.error).toBeTruthy();
    expect(remove).toHaveBeenCalledWith([path]);
  });
});

describe("removePhoto", () => {
  it("deletes the record, then the file", async () => {
    queue("product_images", { data: [{ storage_path: "a/b/extra-x.webp" }], error: null });
    expect(await removePhoto({ photoId: "img-1" })).toEqual({ error: null });
    expect(remove).toHaveBeenCalledWith(["a/b/extra-x.webp"]);
  });

  it("explains why a required photo of a listed item stays", async () => {
    queue("product_images", { data: null, error: { code: "23514", message: "Replace this photo" } });
    const state = await removePhoto({ photoId: "img-1" });
    expect(state.error).toMatch(/เปลี่ยนรูป/);
    expect(remove).not.toHaveBeenCalled();
  });

  it("reports a photo that is not yours", async () => {
    queue("product_images", { data: [], error: null });
    expect((await removePhoto({ photoId: "img-x" })).error).toMatch(/ไม่พบ/);
  });
});
