// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createSharedTestDb, createUser, expectBlockedByPolicy } from "@/test/db";

let db: PGlite;

async function shop(slug: string, name: string, province: string, styles: string[], status = "approved") {
  const owner = await createUser(db);
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, status, approved_at)
     values ($1, $2, $3, $4, $5::shop_status, case when $5::text = 'approved' then now() end) returning id`,
    [owner, slug, name, province, status],
  );
  for (const style of styles) {
    await db.query("insert into shop_styles (shop_id, style_id) select $1, id from styles where slug = $2", [res.rows[0].id, style]);
  }
  return res.rows[0].id;
}

async function item(shopId: string, title: string, brand: string | null, category: string, styles: string[], status = "active") {
  const res = await db.query<{ id: string }>(
    `insert into products (shop_id, title, brand, category, size_label, price_satang, condition, has_flaws)
     values ($1, $2, $3, $4::product_category, 'M', 50000, 'good', false) returning id`,
    [shopId, title, brand, category],
  );
  const id = res.rows[0].id;
  for (const style of styles) {
    await db.query("insert into product_styles (product_id, style_id) select $1, id from styles where slug = $2", [id, style]);
  }
  if (status !== "draft") {
    for (const kind of ["front", "back", "label"]) {
      await db.query("insert into product_images (product_id, kind, storage_path) values ($1, $2, $3)", [id, kind, `${id}/${kind}.webp`]);
    }
    await db.query("update products set status = 'active' where id = $1", [id]);
  }
  return id;
}

beforeAll(async () => {
  db = await createSharedTestDb();
  const season = await shop("second-season", "SECOND SEASON", "ภูเก็ต", ["designer"]);
  const tuek = await shop("tuekdaeng", "TUEKDAENG VINTAGE", "กรุงเทพมหานคร", ["vintage"]);
  const night = await shop("nightshift", "NIGHTSHIFT SUPPLY", "เชียงใหม่", ["streetwear"]);
  const hidden = await shop("hidden", "HIDDEN SHOP", "กรุงเทพมหานคร", ["vintage"], "pending");

  await item(season, "เสื้อโปโลปักม้า สีกรมท่า", "Ralph Lauren", "tops_shirts", ["designer"]);
  await item(season, "Polo shirt piqué white", "Lacoste", "tops_shirts", ["designer"]);
  await item(season, "เสื้อเชิ้ตลายทาง", "Ralph Lauren", "tops_shirts", ["designer"]);
  await item(tuek, "โปโลวินเทจ ลายกราฟิก", null, "tops_shirts", ["vintage"]);
  await item(tuek, "กางเกงยีนส์ทรงกระบอก", "Levi's", "denim", ["vintage"]);
  await item(night, "แจ็กเก็ตทำงาน", "Carhartt", "outerwear", ["streetwear"]);
  await item(night, "ฮู้ดสีดำ โลโก้หลัง", "Stüssy", "sweats", ["streetwear"]);
  await item(night, "โปโลร่างยังไม่ขาย", null, "tops_shirts", ["streetwear"], "draft");
  await item(hidden, "โปโลร้านซ่อน", null, "tops_shirts", ["vintage"]);
}, 60_000);

afterAll(async () => {
  await db.close();
});

async function titles(query: string, extra: Record<string, unknown> = {}) {
  await actAs(db, "anon");
  const args = { p_query: query, p_category: null, p_style: null, ...extra };
  const res = await db.query<{ title: string }>(
    "select title from public.search_products(p_query => $1, p_category => $2::product_category, p_style => $3) order by title",
    [args.p_query, args.p_category, args.p_style],
  );
  await actAsSystem(db);
  return res.rows.map((r) => r.title);
}

const POLO_RESULTS = ["Polo shirt piqué white", "เสื้อเชิ้ตลายทาง", "เสื้อโปโลปักม้า สีกรมท่า", "โปโลวินเทจ ลายกราฟิก"].sort();

describe("smart item search", () => {
  it("finds polos by name in either language and everything from Ralph Lauren", async () => {
    expect((await titles("polo")).sort()).toEqual(POLO_RESULTS);
  });

  it("gives the same results for the Thai word", async () => {
    expect((await titles("โปโล")).sort()).toEqual(POLO_RESULTS);
  });

  it("knows brands by their Thai names", async () => {
    expect(await titles("ลีวายส์")).toEqual(["กางเกงยีนส์ทรงกระบอก"]);
  });

  it.each([
    ["plo", POLO_RESULTS],
    ["carhart", ["แจ็กเก็ตทำงาน"]],
    ["stussy", ["ฮู้ดสีดำ โลโก้หลัง"]],
  ])("forgives a small typo or missing accent: %s", async (query, expected) => {
    expect((await titles(query)).sort()).toEqual([...expected].sort());
  });

  it("finds a brand from the start of its name", async () => {
    expect((await titles("ralp")).sort()).toEqual(["เสื้อเชิ้ตลายทาง", "เสื้อโปโลปักม้า สีกรมท่า"].sort());
  });

  it("treats jeans, ยีนส์ and denim as the same thing", async () => {
    for (const q of ["jeans", "ยีนส์", "denim"]) expect(await titles(q)).toEqual(["กางเกงยีนส์ทรงกระบอก"]);
  });

  it("matches category names", async () => {
    expect(await titles("hoodie")).toEqual(["ฮู้ดสีดำ โลโก้หลัง"]);
  });

  it("still requires every word to match", async () => {
    expect(await titles("polo lacoste")).toEqual(["Polo shirt piqué white"]);
  });

  it("returns nothing for words it cannot place", async () => {
    expect(await titles("zzzzqqq")).toEqual([]);
  });

  it("never shows drafts or items from unapproved shops", async () => {
    const results = await titles("โปโล");
    expect(results).not.toContain("โปโลร่างยังไม่ขาย");
    expect(results).not.toContain("โปโลร้านซ่อน");
  });
});

describe("search_related_shops", () => {
  type ShopRow = { slug: string; match_count: number };

  async function related(params: { query?: string; style?: string; category?: string }) {
    await actAs(db, "anon");
    const res = await db.query<ShopRow>(
      `select slug, match_count from public.search_related_shops(
         p_query => $1, p_style => $2, p_category => $3::product_category)`,
      [params.query ?? null, params.style ?? null, params.category ?? null],
    );
    await actAsSystem(db);
    return res.rows;
  }

  it("ranks shops by how many matching items they have", async () => {
    expect(await related({ query: "polo" })).toEqual([
      { slug: "second-season", match_count: 3 },
      { slug: "tuekdaeng", match_count: 1 },
    ]);
  });

  it("lists the shops of a style, including ones tagged with it but with no items yet", async () => {
    const rows = await related({ style: "vintage" });
    expect(rows.map((r) => r.slug)).toEqual(["tuekdaeng"]);
    expect(rows[0].match_count).toBe(2);
  });

  it("lists the shops of a category", async () => {
    expect((await related({ category: "denim" })).map((r) => r.slug)).toEqual(["tuekdaeng"]);
  });

  it("includes a shop whose name matches even without matching items", async () => {
    expect((await related({ query: "nightshift" })).map((r) => r.slug)).toEqual(["nightshift"]);
  });
});

describe("search_suggest", () => {
  type Suggest = {
    brands: { name: string }[];
    shops: { slug: string; match_count: number }[];
    styles: { slug: string }[];
    categories: { value: string }[];
  };

  async function suggest(query: string): Promise<Suggest> {
    await actAs(db, "anon");
    const res = await db.query<{ s: Suggest }>("select public.search_suggest($1) as s", [query]);
    await actAsSystem(db);
    return res.rows[0].s;
  }

  it("groups suggestions for polo: brand, shops, styles and categories", async () => {
    const s = await suggest("polo");
    expect(s.brands.map((b) => b.name)).toContain("Ralph Lauren");
    expect(s.shops.map((x) => x.slug)).toEqual(["second-season", "tuekdaeng"]);
    expect(s.styles.map((x) => x.slug)).toEqual(expect.arrayContaining(["designer", "vintage"]));
    expect(s.categories.map((c) => c.value)).toEqual(["tops_shirts"]);
  });

  it("suggests a brand from a partial or misspelt name", async () => {
    expect((await suggest("lacos")).brands.map((b) => b.name)).toContain("Lacoste");
    expect((await suggest("levis")).brands.map((b) => b.name)).toContain("Levi's");
  });

  it("returns empty groups for an empty query", async () => {
    expect(await suggest("  ")).toEqual({ brands: [], shops: [], styles: [], categories: [] });
  });
});

describe("search vocabulary tables", () => {
  it("are readable by everyone and writable by no one from the browser", async () => {
    await actAs(db, "anon");
    const brands = await db.query("select count(*)::int as n from brands");
    expect((brands.rows[0] as { n: number }).n).toBeGreaterThan(10);
    await expectBlockedByPolicy(db.query("insert into brands (name, aliases) values ('Fake', '{fake}')"));
    await expectBlockedByPolicy(db.query("insert into search_synonyms (words) values ('{a,b}')"));
    await actAsSystem(db);
  });
});
