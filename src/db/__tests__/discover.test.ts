// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createTestDb, createUser, expectBlockedByPolicy, expectRejectedByRule } from "@/test/db";

let db: PGlite;
let ownerId: string;
let shopId: string;

async function item(title: string, size: string, price: number, opts: { status?: string; category?: string } = {}) {
  const res = await db.query<{ id: string }>(
    `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws)
     values ($1, $2, $3::product_category, $4, $5, 'good', false) returning id`,
    [shopId, title, opts.category ?? "denim", size, price],
  );
  const id = res.rows[0].id;
  if (opts.status !== "draft") {
    for (const kind of ["front", "back", "label"]) {
      await db.query("insert into product_images (product_id, kind, storage_path) values ($1, $2::image_kind, $3)", [id, kind, `x/${kind}`]);
    }
    await db.query("update products set status = 'active' where id = $1", [id]);
    if (opts.status === "sold") await db.query("update products set status = 'sold', sold_at = now() where id = $1", [id]);
  }
  return id;
}

const view = (id: string, viewer: string) => db.query<{ ok: boolean }>("select public.record_product_view($1, $2) as ok", [id, viewer]);
const V = (n: number) => `viewer-${String(n).padStart(12, "0")}`;

beforeEach(async () => {
  db = await createTestDb();
  ownerId = await createUser(db);
  const res = await db.query<{ id: string }>(
    "insert into shops (owner_id, slug, display_name, province, status, approved_at) values ($1, 'thrifthouse', 'THRIFT HOUSE', 'เชียงใหม่', 'approved', now()) returning id",
    [ownerId],
  );
  shopId = res.rows[0].id;
});

describe("record_product_view", () => {
  it("counts each visitor once per day", async () => {
    const id = await item("ยีนส์ A", "32", 90000);
    await actAs(db, "anon");
    expect((await view(id, V(1))).rows[0].ok).toBe(true);
    expect((await view(id, V(1))).rows[0].ok).toBe(false);
    await view(id, V(2));
    await actAsSystem(db);
    expect((await db.query<{ n: number }>("select count(*)::int as n from product_views")).rows[0].n).toBe(2);
  });

  it("ignores the shop owner looking at their own items", async () => {
    const id = await item("ยีนส์ A", "32", 90000);
    await actAs(db, "authenticated", ownerId);
    expect((await view(id, V(1))).rows[0].ok).toBe(false);
  });

  it("ignores drafts and rejects nonsense viewer ids", async () => {
    const draft = await item("ร่าง", "32", 90000, { status: "draft" });
    const live = await item("ยีนส์", "32", 90000);
    await actAs(db, "anon");
    expect((await view(draft, V(1))).rows[0].ok).toBe(false);
    await expectRejectedByRule(view(live, "short"));
  });

  it("keeps the view log private", async () => {
    await actAs(db, "anon");
    await expectBlockedByPolicy(db.query("select * from product_views"));
  });
});

describe("trending_products", () => {
  it("ranks items on sale by distinct viewers in the last 7 days, above a minimum", async () => {
    const hot = await item("ยีนส์ฮิต", "32", 90000);
    const warm = await item("ยีนส์อุ่น", "30", 50000);
    const cold = await item("ยีนส์เงียบ", "34", 40000);
    const sold = await item("ยีนส์ขายแล้ว", "32", 40000);
    await actAs(db, "anon");
    for (let i = 0; i < 5; i++) await view(hot, V(i));
    for (let i = 0; i < 3; i++) await view(warm, V(i));
    await view(cold, V(1));
    for (let i = 0; i < 9; i++) await view(sold, V(i));
    await actAsSystem(db);
    await db.query("update products set status = 'sold', sold_at = now() where id = $1", [sold]);
    // Old views fall out of the window.
    await db.query("insert into product_views (product_id, day, viewer) select $1, current_date - 9, 'old-viewer-0000000-' || g from generate_series(1, 20) g", [cold]);

    await actAs(db, "anon");
    const res = await db.query<{ title: string; views: number }>("select title, views from public.trending_products(p_min_views => 3)");
    expect(res.rows).toEqual([
      { title: "ยีนส์ฮิต", views: 5 },
      { title: "ยีนส์อุ่น", views: 3 },
    ]);
  });
});

describe("search_facets", () => {
  it("lists the sizes found in the current results, most common first", async () => {
    await item("ยีนส์ A", "32", 90000);
    await item("ยีนส์ B", "32", 50000);
    await item("ยีนส์ C", "30", 120000);
    await item("เสื้อ", "M", 30000, { category: "tees" });
    await actAs(db, "anon");
    const res = await db.query<{ size_label: string; n: number }>(
      "select size_label, n from public.search_facets(p_query => 'ยีนส์')",
    );
    expect(res.rows).toEqual([
      { size_label: "32", n: 2 },
      { size_label: "30", n: 1 },
    ]);
    const cheap = await db.query("select size_label from public.search_facets(p_query => 'ยีนส์', p_max_satang => 60000)");
    expect(cheap.rows).toEqual([{ size_label: "32" }]);
  });
});

describe("search_related_shops with price and size", () => {
  it("counts only items that pass the filters", async () => {
    await item("ยีนส์ A", "32", 90000);
    await item("ยีนส์ B", "30", 50000);
    await actAs(db, "anon");
    const all = await db.query<{ match_count: number }>("select match_count from public.search_related_shops(p_query => 'ยีนส์')");
    expect(all.rows[0].match_count).toBe(2);
    const sized = await db.query<{ match_count: number }>(
      "select match_count from public.search_related_shops(p_query => 'ยีนส์', p_size => '32')",
    );
    expect(sized.rows[0].match_count).toBe(1);
    const cheap = await db.query<{ match_count: number }>(
      "select match_count from public.search_related_shops(p_query => 'ยีนส์', p_max_satang => 60000)",
    );
    expect(cheap.rows[0].match_count).toBe(1);
  });

  it("still powers search suggestions", async () => {
    await item("ยีนส์ A", "32", 90000);
    await actAs(db, "anon");
    const res = await db.query<{ s: { shops: { slug: string }[] } }>("select public.search_suggest('ยีนส์') as s");
    expect(res.rows[0].s.shops.map((x) => x.slug)).toEqual(["thrifthouse"]);
  });
});

describe("several values in one filter", () => {
  it("matches any of the chosen sizes and categories, in items, shop counts and size lists", async () => {
    await item("ยีนส์ 30", "30", 50000);
    await item("ยีนส์ 32", "32", 50000);
    await item("ยีนส์ 34", "34", 50000);
    await item("เสื้อ M", "M", 30000, { category: "tees" });
    await item("ฮู้ด L", "L", 30000, { category: "sweats" });
    await actAs(db, "anon");
    const sized = await db.query<{ title: string }>(
      "select title from public.search_products(p_sizes => array['30','34']) order by title",
    );
    expect(sized.rows.map((r) => r.title)).toEqual(["ยีนส์ 30", "ยีนส์ 34"]);
    const cats = await db.query<{ title: string }>(
      "select title from public.search_products(p_categories => array['tees','sweats']::product_category[]) order by title",
    );
    expect(cats.rows.map((r) => r.title)).toEqual(["ฮู้ด L", "เสื้อ M"]);
    const shops = await db.query<{ match_count: number }>(
      "select match_count from public.search_related_shops(p_sizes => array['30','32'])",
    );
    expect(shops.rows[0].match_count).toBe(2);
    const facets = await db.query<{ size_label: string }>(
      "select size_label from public.search_facets(p_categories => array['tees','sweats']::product_category[]) order by size_label",
    );
    expect(facets.rows.map((r) => r.size_label)).toEqual(["L", "M"]);
  });

  it("matches sizes regardless of letter case", async () => {
    await item("ยีนส์ฟรีไซซ์", "Free", 50000);
    await actAs(db, "anon");
    const res = await db.query("select title from public.search_products(p_sizes => array['FREE'])");
    expect(res.rows).toHaveLength(1);
  });
});
