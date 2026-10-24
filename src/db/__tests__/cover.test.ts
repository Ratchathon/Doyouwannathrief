// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createSharedTestDb, createUser } from "@/test/db";

// One shared catalogue for the homepage cover numbers.
let db: PGlite;

async function shop(slug: string, name: string, province: string, status: "approved" | "pending") {
  const owner = await createUser(db);
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, status, approved_at)
     values ($1, $2, $3, $4, $5::shop_status, case when $5::text = 'approved' then now() end) returning id`,
    [owner, slug, name, province, status],
  );
  return res.rows[0].id;
}

async function item(shopId: string, opts: { baht: number; styles: string[]; status: string; daysAgo?: number }) {
  const res = await db.query<{ id: string }>(
    `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws, created_at)
     values ($1, 'ชิ้นทดสอบ', 'tees', 'M', $2, 'good', false, now() - make_interval(days => $3)) returning id`,
    [shopId, opts.baht * 100, opts.daysAgo ?? 1],
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
}

type Stat = {
  slug: string;
  name_en: string;
  name_th: string;
  pieces: number;
  shops: number;
  new_pieces: number;
  top_shop_name: string | null;
  top_shop_province: string | null;
};

beforeAll(async () => {
  db = await createSharedTestDb();
  const red = await shop("tuekdaeng", "TUEKDAENG VINTAGE", "กรุงเทพมหานคร", "approved");
  const hard = await shop("hardwear", "HARDWEAR CO.", "นครราชสีมา", "approved");
  const hidden = await shop("hidden", "HIDDEN", "ภูเก็ต", "pending");

  // vintage: red has 3 on sale (2 new this week), hard has 1 old; plus pieces that must not count.
  await item(red, { baht: 1890, styles: ["vintage"], status: "active", daysAgo: 1 });
  await item(red, { baht: 450, styles: ["vintage", "workwear"], status: "active", daysAgo: 2 });
  await item(red, { baht: 1290, styles: ["vintage"], status: "active", daysAgo: 30 });
  await item(red, { baht: 300, styles: ["vintage"], status: "sold" });
  await item(red, { baht: 300, styles: ["vintage"], status: "reserved" });
  await item(red, { baht: 300, styles: ["vintage"], status: "draft" });
  await item(hard, { baht: 2450, styles: ["vintage"], status: "active", daysAgo: 20 });
  // workwear: hard has 2 old, red's shared piece above makes 3.
  await item(hard, { baht: 500, styles: ["workwear"], status: "active", daysAgo: 40 });
  await item(hard, { baht: 790, styles: ["workwear"], status: "active", daysAgo: 40 });
  // A pending shop's piece never counts.
  await item(hidden, { baht: 100, styles: ["y2k"], status: "active" });
});

afterAll(async () => {
  await actAsSystem(db);
});

async function stats(): Promise<Stat[]> {
  await actAs(db, "anon");
  return (await db.query<Stat>("select * from public.style_stats()")).rows;
}

describe("style_stats", () => {
  it("lists every style in menu order, even empty ones", async () => {
    const rows = await stats();
    expect(rows.map((r) => r.slug)).toEqual(["streetwear", "vintage", "designer", "y2k", "korean-japanese", "workwear"]);
    expect(rows.find((r) => r.slug === "y2k")).toMatchObject({ pieces: 0, shops: 0, new_pieces: 0, top_shop_name: null });
  });

  it("counts only pieces on sale from approved shops", async () => {
    const vintage = (await stats()).find((r) => r.slug === "vintage")!;
    expect(vintage).toMatchObject({ name_en: "Vintage", name_th: "วินเทจ", pieces: 4, shops: 2 });
  });

  it("counts pieces listed in the last 7 days", async () => {
    const rows = await stats();
    expect(rows.find((r) => r.slug === "vintage")!.new_pieces).toBe(2);
    expect(rows.find((r) => r.slug === "workwear")!.new_pieces).toBe(1);
  });

  it("names the shop with the most pieces in the style", async () => {
    const rows = await stats();
    expect(rows.find((r) => r.slug === "vintage")).toMatchObject({
      top_shop_name: "TUEKDAENG VINTAGE",
      top_shop_province: "กรุงเทพมหานคร",
    });
    expect(rows.find((r) => r.slug === "workwear")!.top_shop_name).toBe("HARDWEAR CO.");
  });
});

describe("count_on_sale", () => {
  it("counts pieces on sale at or under a price", async () => {
    await actAs(db, "anon");
    const n = async (satang: number) =>
      (await db.query<{ n: number }>("select public.count_on_sale($1) as n", [satang])).rows[0].n;
    expect(await n(50000)).toBe(2);
    expect(await n(100000)).toBe(3);
  });
});
