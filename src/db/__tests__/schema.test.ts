// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, createUser, expectRejectedByRule } from "@/test/db";

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb();
});

async function insertShop(overrides: Record<string, unknown> = {}) {
  const ownerId = overrides.owner_id ?? (await createUser(db));
  const row = {
    owner_id: ownerId,
    slug: `shop-${Math.random().toString(36).slice(2, 8)}`,
    display_name: "ร้านมือสองตึกแดง",
    province: "กรุงเทพมหานคร",
    ...overrides,
  };
  const cols = Object.keys(row);
  const res = await db.query<{ id: string; status: string }>(
    `insert into shops (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
    Object.values(row),
  );
  return res.rows[0];
}

async function insertProduct(shopId: string, overrides: Record<string, unknown> = {}) {
  const row = {
    shop_id: shopId,
    title: "เสื้อเชิ้ตเดนิม Levi's ยุค 90",
    category: "tops",
    size_label: "L",
    price_satang: 89000,
    condition: "good",
    has_flaws: false,
    ...overrides,
  };
  const cols = Object.keys(row);
  const res = await db.query<{ id: string; status: string }>(
    `insert into products (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
    Object.values(row),
  );
  return res.rows[0];
}

async function insertImage(productId: string, kind: string, position = 0) {
  await db.query(
    "insert into product_images (product_id, kind, storage_path, position) values ($1, $2, $3, $4)",
    [productId, kind, `products/${productId}/${kind}-${position}.webp`, position],
  );
}

describe("profiles", () => {
  it("creates a buyer profile automatically when a user signs up", async () => {
    const userId = await createUser(db);
    const res = await db.query<{ role: string }>("select role from profiles where id = $1", [userId]);
    expect(res.rows).toEqual([{ role: "buyer" }]);
  });
});

describe("shops", () => {
  it("starts as pending review", async () => {
    const shop = await insertShop();
    expect(shop.status).toBe("pending");
  });

  it.each(["tuekdaeng", "tuek-daeng", "shop99", "abc"])("accepts slug %s", async (slug) => {
    await expect(insertShop({ slug })).resolves.toBeDefined();
  });

  it.each([
    ["uppercase", "TuekDaeng"],
    ["thai characters", "ตึกแดง"],
    ["too short", "ab"],
    ["too long", "a".repeat(31)],
    ["leading hyphen", "-tuek"],
    ["double hyphen", "tuek--daeng"],
    ["spaces", "tuek daeng"],
  ])("rejects slug with %s", async (_label, slug) => {
    await expectRejectedByRule(insertShop({ slug }));
  });

  it("rejects a duplicate slug", async () => {
    await insertShop({ slug: "tuekdaeng" });
    await expectRejectedByRule(insertShop({ slug: "tuekdaeng" }));
  });

  it("allows only one shop per owner", async () => {
    const ownerId = await createUser(db);
    await insertShop({ owner_id: ownerId });
    await expectRejectedByRule(insertShop({ owner_id: ownerId }));
  });

  it("requires a reason when rejected", async () => {
    await expectRejectedByRule(insertShop({ status: "rejected" }));
    await expect(insertShop({ status: "rejected", rejection_reason: "สินค้ายังไม่ตรงแนวของเว็บ" })).resolves.toBeDefined();
  });

});

describe("shop terms (commission)", () => {
  const setTerms = (shopId: string, values: Record<string, unknown>) => {
    const cols = Object.keys(values);
    return db.query(
      `update shop_terms set ${cols.map((c, i) => `${c} = $${i + 2}`).join(", ")} where shop_id = $1`,
      [shopId, ...Object.values(values)],
    );
  };

  it("are created with the standard rate when a shop applies", async () => {
    const shop = await insertShop();
    const res = await db.query<{ commission_rate: string }>(
      "select commission_rate from shop_terms where shop_id = $1",
      [shop.id],
    );
    expect(res.rows).toEqual([{ commission_rate: "0.1000" }]);
  });

  it("keep commission between 0% and 100%", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(setTerms(shop.id, { commission_rate: 1.5 }));
    await expectRejectedByRule(setTerms(shop.id, { commission_rate: -0.1 }));
    await setTerms(shop.id, { commission_rate: 0 });
  });

  it("require promo rate and promo end date together", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(setTerms(shop.id, { promo_commission_rate: 0 }));
    await expectRejectedByRule(setTerms(shop.id, { promo_ends_at: "2027-01-31T23:59:59+07:00" }));
    await setTerms(shop.id, { promo_commission_rate: 0, promo_ends_at: "2027-01-31T23:59:59+07:00" });
  });

  it("are removed with their shop", async () => {
    const shop = await insertShop();
    await db.query("delete from shops where id = $1", [shop.id]);
    const res = await db.query("select count(*)::int as n from shop_terms");
    expect(res.rows[0]).toEqual({ n: 0 });
  });
});

describe("products", () => {
  it("starts as a draft", async () => {
    const shop = await insertShop();
    const product = await insertProduct(shop.id);
    expect(product.status).toBe("draft");
  });

  it("requires a positive price in satang", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(insertProduct(shop.id, { price_satang: 0 }));
    await expectRejectedByRule(insertProduct(shop.id, { price_satang: -100 }));
  });

  it("requires positive measurements when given", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(insertProduct(shop.id, { chest_cm: 0 }));
    await expect(insertProduct(shop.id, { chest_cm: 56, length_cm: 72, shoulder_cm: 48 })).resolves.toBeDefined();
  });

  it("rejects unknown categories and conditions", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(insertProduct(shop.id, { category: "spaceships" }));
    await expectRejectedByRule(insertProduct(shop.id, { condition: "destroyed" }));
  });

  it("records when an item was sold", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(insertProduct(shop.id, { status: "sold" }));
    await expect(insertProduct(shop.id, { status: "sold", sold_at: new Date().toISOString() })).resolves.toBeDefined();
  });
});

describe("product images", () => {
  it("allows exactly one front, back and label photo per product", async () => {
    const shop = await insertShop();
    const product = await insertProduct(shop.id);
    for (const kind of ["front", "back", "label"]) {
      await insertImage(product.id, kind);
      await expectRejectedByRule(insertImage(product.id, kind, 1));
    }
  });

  it("allows many flaw and extra photos", async () => {
    const shop = await insertShop();
    const product = await insertProduct(shop.id, { has_flaws: true });
    await insertImage(product.id, "flaw", 0);
    await insertImage(product.id, "flaw", 1);
    await insertImage(product.id, "extra", 0);
    await insertImage(product.id, "extra", 1);
    const res = await db.query("select count(*)::int as n from product_images where product_id = $1", [product.id]);
    expect(res.rows[0]).toEqual({ n: 4 });
  });

  it("are deleted with their product", async () => {
    const shop = await insertShop();
    const product = await insertProduct(shop.id);
    await insertImage(product.id, "front");
    await db.query("delete from products where id = $1", [product.id]);
    const res = await db.query("select count(*)::int as n from product_images");
    expect(res.rows[0]).toEqual({ n: 0 });
  });
});

describe("brand", () => {
  it("is optional and stored on the product", async () => {
    const shop = await insertShop();
    const withBrand = await insertProduct(shop.id, { brand: "Levi's" });
    const res = await db.query<{ brand: string | null }>("select brand from products where id = $1", [withBrand.id]);
    expect(res.rows[0].brand).toBe("Levi's");
    await expect(insertProduct(shop.id)).resolves.toBeDefined();
  });
});

describe("styles", () => {
  async function styleId(slug: string) {
    const res = await db.query<{ id: string }>("select id from styles where slug = $1", [slug]);
    if (!res.rows[0]) throw new Error(`style ${slug} not seeded`);
    return res.rows[0].id;
  }

  it("ships with the starter style list", async () => {
    const res = await db.query<{ slug: string }>("select slug from styles order by position");
    expect(res.rows.map((r) => r.slug)).toEqual([
      "streetwear",
      "vintage",
      "designer",
      "y2k",
      "korean-japanese",
      "workwear",
    ]);
  });

  it("every style has Thai and English names", async () => {
    const res = await db.query("select count(*)::int as n from styles where name_th = '' or name_en = ''");
    expect(res.rows[0]).toEqual({ n: 0 });
  });

  it("lets a product have up to 3 styles, not 4", async () => {
    const shop = await insertShop();
    const product = await insertProduct(shop.id);
    for (const slug of ["streetwear", "vintage", "y2k"]) {
      await db.query("insert into product_styles (product_id, style_id) values ($1, $2)", [product.id, await styleId(slug)]);
    }
    await expectRejectedByRule(
      db.query("insert into product_styles (product_id, style_id) values ($1, $2)", [product.id, await styleId("workwear")]),
    );
  });

  it("lets a shop have up to 3 styles, not 4", async () => {
    const shop = await insertShop();
    for (const slug of ["streetwear", "vintage", "y2k"]) {
      await db.query("insert into shop_styles (shop_id, style_id) values ($1, $2)", [shop.id, await styleId(slug)]);
    }
    await expectRejectedByRule(
      db.query("insert into shop_styles (shop_id, style_id) values ($1, $2)", [shop.id, await styleId("workwear")]),
    );
  });

  it("does not tag the same style twice", async () => {
    const shop = await insertShop();
    const product = await insertProduct(shop.id);
    const id = await styleId("vintage");
    await db.query("insert into product_styles (product_id, style_id) values ($1, $2)", [product.id, id]);
    await expectRejectedByRule(db.query("insert into product_styles (product_id, style_id) values ($1, $2)", [product.id, id]));
  });
});

describe("reports", () => {
  async function insertReport(overrides: Record<string, unknown>) {
    const row = {
      reporter_id: await createUser(db),
      target_type: "website",
      reason: "bug",
      details: "กดปุ่มค้นหาแล้วหน้าเว็บค้าง",
      ...overrides,
    };
    const cols = Object.keys(row);
    const res = await db.query<{ status: string }>(
      `insert into reports (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
      Object.values(row),
    );
    return res.rows[0];
  }

  it("opens a website report with status open", async () => {
    const report = await insertReport({});
    expect(report.status).toBe("open");
  });

  it("requires the reported product for product reports", async () => {
    const shop = await insertShop();
    const product = await insertProduct(shop.id);
    await expectRejectedByRule(insertReport({ target_type: "product", reason: "counterfeit" }));
    await expect(
      insertReport({ target_type: "product", reason: "counterfeit", product_id: product.id }),
    ).resolves.toBeDefined();
  });

  it("requires the reported shop for shop reports", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(insertReport({ target_type: "shop", reason: "shop_behavior" }));
    await expect(insertReport({ target_type: "shop", reason: "shop_behavior", shop_id: shop.id })).resolves.toBeDefined();
  });

  it("does not point a website report at a product or shop", async () => {
    const shop = await insertShop();
    await expectRejectedByRule(insertReport({ target_type: "website", shop_id: shop.id }));
  });

  it("needs details of at least 10 characters", async () => {
    await expectRejectedByRule(insertReport({ details: "เสีย" }));
  });

  it("records when a report was closed", async () => {
    await expectRejectedByRule(insertReport({ status: "closed" }));
    await expect(insertReport({ status: "closed", resolved_at: new Date().toISOString() })).resolves.toBeDefined();
  });
});
