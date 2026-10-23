// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createProduct, createTestDb, createUser, expectBlockedByPolicy, expectRejectedByRule } from "@/test/db";

let db: PGlite;
let ownerId: string;
let strangerId: string;
let shopId: string;

function save(productId: string | null, overrides: { title?: string; styles?: string[]; shopId?: string } = {}) {
  return db.query<{ save_listing: string }>(
    `select public.save_listing($1, $2, $3, 'Levi''s', '', 'tops_shirts', 'L', 89000, 'good', false, null,
       58, 74, 50, null, $4)`,
    [productId, overrides.shopId ?? shopId, overrides.title ?? "เสื้อเชิ้ตเดนิม", `{${(overrides.styles ?? ["vintage"]).join(",")}}`],
  );
}

async function stylesOf(productId: string) {
  await actAsSystem(db);
  const res = await db.query<{ slug: string }>(
    "select s.slug from product_styles ps join styles s on s.id = ps.style_id where ps.product_id = $1 order by s.slug",
    [productId],
  );
  return res.rows.map((r) => r.slug);
}

beforeEach(async () => {
  db = await createTestDb();
  ownerId = await createUser(db);
  strangerId = await createUser(db);
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, status, approved_at)
     values ($1, 'tuekdaeng', 'ร้าน', 'กรุงเทพมหานคร', 'approved', now()) returning id`,
    [ownerId],
  );
  shopId = res.rows[0].id;
});

describe("save_listing", () => {
  it("creates a draft with its styles", async () => {
    await actAs(db, "authenticated", ownerId);
    const id = (await save(null, { styles: ["vintage", "workwear"] })).rows[0].save_listing;
    expect(await stylesOf(id)).toEqual(["vintage", "workwear"]);
    const res = await db.query<{ status: string; brand: string }>("select status, brand from products where id = $1", [id]);
    expect(res.rows[0]).toEqual({ status: "draft", brand: "Levi's" });
  });

  it("updates an item and replaces its styles", async () => {
    await actAs(db, "authenticated", ownerId);
    const id = (await save(null, { styles: ["vintage"] })).rows[0].save_listing;
    await actAs(db, "authenticated", ownerId);
    await save(id, { title: "เสื้อเชิ้ตเดนิม ยุค 90", styles: ["streetwear", "y2k"] });
    expect(await stylesOf(id)).toEqual(["streetwear", "y2k"]);
    const res = await db.query<{ title: string }>("select title from products where id = $1", [id]);
    expect(res.rows[0].title).toBe("เสื้อเชิ้ตเดนิม ยุค 90");
  });

  it("keeps an item on sale when it is edited", async () => {
    const id = await createProduct(db, shopId, "active");
    await actAs(db, "authenticated", ownerId);
    await save(id);
    await actAsSystem(db);
    const res = await db.query<{ status: string }>("select status from products where id = $1", [id]);
    expect(res.rows[0].status).toBe("active");
  });

  it.each(["reserved", "sold"] as const)("refuses to edit a %s item", async (status) => {
    const id = await createProduct(db, shopId, status);
    await actAs(db, "authenticated", ownerId);
    await expectRejectedByRule(save(id));
  });

  it("saves nothing when a style is unknown", async () => {
    await actAs(db, "authenticated", ownerId);
    await expectRejectedByRule(save(null, { styles: ["vintage", "spaceships"] }));
    await actAsSystem(db);
    const res = await db.query("select count(*)::int as n from products");
    expect(res.rows[0]).toEqual({ n: 0 });
  });

  it("refuses to add to someone else's shop", async () => {
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(save(null));
  });

  it("refuses to edit someone else's item", async () => {
    const id = await createProduct(db, shopId, "draft");
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(save(id));
  });
});
