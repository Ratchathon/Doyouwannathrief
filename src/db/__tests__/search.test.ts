// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createSharedTestDb, createUser } from "@/test/db";

// One shared, read-only catalogue for every test in this file.
let db: PGlite;

type Row = {
  id: string;
  title: string;
  brand: string | null;
  price_satang: number;
  status: string;
  shop_slug: string;
  shop_name: string;
  province: string;
  front_path: string | null;
};

async function shop(slug: string, name: string, province: string, status: "approved" | "pending", styles: string[]) {
  const owner = await createUser(db);
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, bio, status, approved_at)
     values ($1, $2, $3, $4, 'คัดมือทุกชิ้น', $5::shop_status, case when $5::text = 'approved' then now() end) returning id`,
    [owner, slug, name, province, status],
  );
  const id = res.rows[0].id;
  for (const style of styles) {
    await db.query("insert into shop_styles (shop_id, style_id) select $1, id from styles where slug = $2", [id, style]);
  }
  return id;
}

let clock = 0;
async function item(
  shopId: string,
  title: string,
  opts: { brand?: string; category?: string; size?: string; baht: number; styles: string[]; status: string },
) {
  const res = await db.query<{ id: string }>(
    `insert into products (shop_id, title, brand, category, size_label, price_satang, condition, has_flaws, created_at)
     values ($1, $2, $3, $4::product_category, $5, $6, 'good', false, now() + make_interval(secs => $7)) returning id`,
    [shopId, title, opts.brand ?? null, opts.category ?? "tops", opts.size ?? "M", opts.baht * 100, clock++],
  );
  const id = res.rows[0].id;
  for (const style of opts.styles) {
    await db.query("insert into product_styles (product_id, style_id) select $1, id from styles where slug = $2", [id, style]);
  }
  if (opts.status !== "draft") {
    for (const kind of ["front", "back", "label"]) {
      await db.query("insert into product_images (product_id, kind, storage_path) values ($1, $2, $3)", [id, kind, `${id}/${kind}.webp`]);
    }
    await db.query("update products set status = 'active' where id = $1", [id]);
    if (opts.status === "reserved") await db.query("update products set status = 'reserved' where id = $1", [id]);
    if (opts.status === "sold") await db.query("update products set status = 'sold', sold_at = now() where id = $1", [id]);
  }
  return id;
}

beforeAll(async () => {
  db = await createSharedTestDb();
  const a = await shop("tuekdaeng", "ร้านมือสองตึกแดง", "กรุงเทพมหานคร", "approved", ["vintage", "workwear"]);
  const b = await shop("nimman-thrift", "Nimman Thrift", "เชียงใหม่", "approved", ["streetwear"]);
  const c = await shop("hidden-shop", "ร้านที่ยังไม่อนุมัติ", "กรุงเทพมหานคร", "pending", ["vintage"]);

  await item(a, "เสื้อเชิ้ตเดนิม ยุค 90", { brand: "Levi's", baht: 890, size: "L", styles: ["vintage"], status: "active" });
  await item(a, "แจ็กเก็ตทำงาน", { brand: "Carhartt", category: "outerwear", baht: 1500, styles: ["workwear"], status: "active" });
  await item(a, "เสื้อขายไปแล้ว", { baht: 300, styles: ["vintage"], status: "sold" });
  await item(a, "เสื้อร่าง", { baht: 300, styles: ["vintage"], status: "draft" });
  await item(b, "เสื้อยืดวง Nirvana", { baht: 450, size: "m", styles: ["streetwear"], status: "active" });
  await item(b, "กางเกงยีนส์ทรงกระบอก", { brand: "Levi's", category: "bottoms", baht: 700, size: "32", styles: ["vintage"], status: "reserved" });
  await item(c, "เสื้อจากร้านที่ซ่อนอยู่", { baht: 500, styles: ["vintage"], status: "active" });
  await item(a, "เสื้อ 100%_cotton", { baht: 200, styles: ["vintage"], status: "active" });
}, 60_000);

afterAll(async () => {
  await db.close();
});

async function search(params: Record<string, unknown> = {}): Promise<Row[]> {
  await actAs(db, "anon");
  const args = {
    p_query: null,
    p_category: null,
    p_style: null,
    p_province: null,
    p_min_satang: null,
    p_max_satang: null,
    p_size: null,
    p_sort: "newest",
    p_limit: 24,
    p_offset: 0,
    ...params,
  };
  const res = await db.query<Row>(
    `select * from public.search_products($1, $2::product_category, $3, $4, $5, $6, $7, $8, $9, $10)`,
    Object.values(args),
  );
  await actAsSystem(db);
  return res.rows;
}

const titles = (rows: Row[]) => rows.map((r) => r.title);

describe("search_products", () => {
  it("lists items on sale and reserved items from approved shops, newest first", async () => {
    expect(titles(await search())).toEqual([
      "เสื้อ 100%_cotton",
      "กางเกงยีนส์ทรงกระบอก",
      "เสื้อยืดวง Nirvana",
      "แจ็กเก็ตทำงาน",
      "เสื้อเชิ้ตเดนิม ยุค 90",
    ]);
  });

  it("finds a Thai word in the middle of a title", async () => {
    expect(titles(await search({ p_query: "เดนิม" }))).toEqual(["เสื้อเชิ้ตเดนิม ยุค 90"]);
  });

  it("matches brands without caring about case", async () => {
    expect(titles(await search({ p_query: "LEVI" })).sort()).toEqual(["กางเกงยีนส์ทรงกระบอก", "เสื้อเชิ้ตเดนิม ยุค 90"].sort());
  });

  it("matches the shop's name", async () => {
    expect(titles(await search({ p_query: "nimman" }))).toEqual(["กางเกงยีนส์ทรงกระบอก", "เสื้อยืดวง Nirvana"]);
  });

  it("matches style names in Thai and English", async () => {
    expect(titles(await search({ p_query: "เวิร์กแวร์" }))).toEqual(["แจ็กเก็ตทำงาน"]);
    expect(titles(await search({ p_query: "workwear" }))).toEqual(["แจ็กเก็ตทำงาน"]);
  });

  it("requires every word to match", async () => {
    expect(titles(await search({ p_query: "เสื้อ levi" }))).toEqual(["เสื้อเชิ้ตเดนิม ยุค 90"]);
  });

  it("treats % and _ as ordinary characters", async () => {
    expect(titles(await search({ p_query: "100%_c" }))).toEqual(["เสื้อ 100%_cotton"]);
    expect(await search({ p_query: "%" })).toHaveLength(1);
  });

  it("filters by category, style, province, size and price", async () => {
    expect(titles(await search({ p_category: "outerwear" }))).toEqual(["แจ็กเก็ตทำงาน"]);
    expect(titles(await search({ p_style: "streetwear" }))).toEqual(["เสื้อยืดวง Nirvana"]);
    expect(titles(await search({ p_province: "เชียงใหม่" }))).toEqual(["กางเกงยีนส์ทรงกระบอก", "เสื้อยืดวง Nirvana"]);
    // Size matches regardless of case: "m" on the Nirvana tee, "M" on the others.
    expect(titles(await search({ p_size: "M" }))).toEqual(["เสื้อ 100%_cotton", "เสื้อยืดวง Nirvana", "แจ็กเก็ตทำงาน"]);
    expect(titles(await search({ p_min_satang: 50000, p_max_satang: 100000 }))).toEqual([
      "กางเกงยีนส์ทรงกระบอก",
      "เสื้อเชิ้ตเดนิม ยุค 90",
    ]);
  });

  it("sorts by price", async () => {
    const asc = (await search({ p_sort: "price_asc" })).map((r) => r.price_satang);
    expect(asc).toEqual([...asc].sort((x, y) => x - y));
    const desc = (await search({ p_sort: "price_desc" })).map((r) => r.price_satang);
    expect(desc).toEqual([...desc].sort((x, y) => y - x));
  });

  it("pages through results and caps the page size", async () => {
    expect(titles(await search({ p_limit: 2, p_offset: 2 }))).toEqual(["เสื้อยืดวง Nirvana", "แจ็กเก็ตทำงาน"]);
    expect(await search({ p_limit: 10_000 })).toHaveLength(5);
  });

  it("returns what a result card needs", async () => {
    const [row] = await search({ p_query: "เดนิม" });
    expect(row).toMatchObject({
      brand: "Levi's",
      price_satang: 89000,
      status: "active",
      shop_slug: "tuekdaeng",
      shop_name: "ร้านมือสองตึกแดง",
      province: "กรุงเทพมหานคร",
    });
    expect(row.front_path).toMatch(/front\.webp$/);
  });
});

describe("search_shops", () => {
  type ShopRow = { slug: string; display_name: string; styles: string[]; item_count: number };

  async function shops(params: Record<string, unknown> = {}): Promise<ShopRow[]> {
    await actAs(db, "anon");
    const args = { p_query: null, p_style: null, p_province: null, p_limit: 24, p_offset: 0, ...params };
    const res = await db.query<ShopRow>("select * from public.search_shops($1, $2, $3, $4, $5)", Object.values(args));
    await actAsSystem(db);
    return res.rows;
  }

  it("lists approved shops only, with their styles and items on sale", async () => {
    const rows = await shops();
    expect(rows.map((r) => r.slug).sort()).toEqual(["nimman-thrift", "tuekdaeng"]);
    const tuek = rows.find((r) => r.slug === "tuekdaeng")!;
    expect(tuek.styles.sort()).toEqual(["vintage", "workwear"]);
    expect(tuek.item_count).toBe(3);
  });

  it("finds shops by Thai or English name and filters by style and province", async () => {
    expect((await shops({ p_query: "ตึกแดง" })).map((r) => r.slug)).toEqual(["tuekdaeng"]);
    expect((await shops({ p_query: "THRIFT" })).map((r) => r.slug)).toEqual(["nimman-thrift"]);
    expect((await shops({ p_style: "streetwear" })).map((r) => r.slug)).toEqual(["nimman-thrift"]);
    expect((await shops({ p_province: "กรุงเทพมหานคร" })).map((r) => r.slug)).toEqual(["tuekdaeng"]);
  });
});
