// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, createTestDb, createUser, expectRejectedByRule } from "@/test/db";

let db: PGlite;
let ownerId: string;
let shopId: string;

async function newProduct(hasFlaws = false) {
  const res = await db.query<{ id: string }>(
    `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws)
     values ($1, 'เสื้อ', 'tops_shirts', 'M', 50000, 'good', $2) returning id`,
    [shopId, hasFlaws],
  );
  return res.rows[0].id;
}

async function addPhotos(productId: string, kinds: string[]) {
  for (const [i, kind] of kinds.entries()) {
    await db.query("insert into product_images (product_id, kind, storage_path, position) values ($1, $2, $3, $4)", [
      productId,
      kind,
      `${productId}/${kind}-${i}.webp`,
      i,
    ]);
  }
}

const setStatus = (id: string, status: string) =>
  db.query(
    `update products set status = $2::product_status,
       sold_at = case when $2::text = 'sold' then now() else sold_at end where id = $1`,
    [id, status],
  );

beforeEach(async () => {
  db = await createTestDb();
  ownerId = await createUser(db);
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, status, approved_at)
     values ($1, 'tuekdaeng', 'ร้าน', 'กรุงเทพมหานคร', 'approved', now()) returning id`,
    [ownerId],
  );
  shopId = res.rows[0].id;
});

describe("putting an item on sale", () => {
  it("needs front, back and label photos", async () => {
    const id = await newProduct();
    await expectRejectedByRule(setStatus(id, "active"));
    await addPhotos(id, ["front", "back"]);
    await expectRejectedByRule(setStatus(id, "active"));
    await addPhotos(id, ["label"]);
    await setStatus(id, "active");
  });

  it("needs a flaw photo when the item has flaws", async () => {
    const id = await newProduct(true);
    await addPhotos(id, ["front", "back", "label"]);
    await expectRejectedByRule(setStatus(id, "active"));
    await addPhotos(id, ["flaw"]);
    await setStatus(id, "active");
  });

  it("cannot skip the check by creating the item already on sale", async () => {
    await expectRejectedByRule(
      db.query(
        `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws, status)
         values ($1, 'เสื้อ', 'tops_shirts', 'M', 50000, 'good', false, 'active')`,
        [shopId],
      ),
    );
  });

  it("cannot mark flaws on a listed item without adding a flaw photo", async () => {
    const id = await newProduct();
    await addPhotos(id, ["front", "back", "label"]);
    await setStatus(id, "active");
    await expectRejectedByRule(db.query("update products set has_flaws = true where id = $1", [id]));
  });
});

describe("photos of a listed item", () => {
  async function listed() {
    const id = await newProduct();
    await addPhotos(id, ["front", "back", "label", "extra"]);
    await setStatus(id, "active");
    return id;
  }

  it("keeps required photos from being deleted", async () => {
    const id = await listed();
    await expectRejectedByRule(db.query("delete from product_images where product_id = $1 and kind = 'front'", [id]));
  });

  it("lets extra photos be deleted", async () => {
    const id = await listed();
    const res = await db.query("delete from product_images where product_id = $1 and kind = 'extra'", [id]);
    expect(res.affectedRows).toBe(1);
  });

  it("lets the owner replace a required photo in place", async () => {
    const id = await listed();
    await actAs(db, "authenticated", ownerId);
    const res = await db.query(
      "update product_images set storage_path = $2 where product_id = $1 and kind = 'front'",
      [id, `${id}/front-new.webp`],
    );
    expect(res.affectedRows).toBe(1);
  });

  it("allows deleting photos of a draft", async () => {
    const id = await newProduct();
    await addPhotos(id, ["front"]);
    const res = await db.query("delete from product_images where product_id = $1", [id]);
    expect(res.affectedRows).toBe(1);
  });

  it("allows deleting the whole item, photos included", async () => {
    const id = await listed();
    const res = await db.query("delete from products where id = $1", [id]);
    expect(res.affectedRows).toBe(1);
  });
});

describe("marking sold", () => {
  it("only applies to items that were on sale", async () => {
    const id = await newProduct();
    await expectRejectedByRule(setStatus(id, "sold"));
  });

  it("works for a listed item", async () => {
    const id = await newProduct();
    await addPhotos(id, ["front", "back", "label"]);
    await setStatus(id, "active");
    await setStatus(id, "sold");
  });
});

describe("reserved and sold items", () => {
  async function reservedItem() {
    const id = await newProduct();
    await addPhotos(id, ["front", "back", "label"]);
    await setStatus(id, "active");
    await db.query("update products set status = 'reserved' where id = $1", [id]);
    return id;
  }

  it("cannot have their details changed, even directly", async () => {
    const id = await reservedItem();
    await expectRejectedByRule(db.query("update products set price_satang = 100 where id = $1", [id]));
  });

  it("can still move on to sold", async () => {
    const id = await reservedItem();
    await setStatus(id, "sold");
  });
});
