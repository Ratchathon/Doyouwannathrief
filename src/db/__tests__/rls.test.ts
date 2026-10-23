// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createProduct, createTestDb, createUser, expectBlockedByPolicy } from "@/test/db";

let db: PGlite;
let ownerId: string;
let strangerId: string;
let adminId: string;
let approvedShopId: string;
let pendingShopId: string;
let pendingOwnerId: string;

async function seedShop(owner: string, slug: string, status: "pending" | "approved") {
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, status, approved_at)
     values ($1, $2, $3, 'กรุงเทพมหานคร', $4::shop_status, case when $4::text = 'approved' then now() end) returning id`,
    [owner, slug, `ร้าน ${slug}`, status],
  );
  return res.rows[0].id;
}

const seedProduct = (shopId: string, status: "draft" | "active" | "reserved" | "sold", title = "เสื้อ") =>
  createProduct(db, shopId, status, title);

async function count(sql: string, params: unknown[] = []) {
  const res = await db.query<{ n: number }>(`select count(*)::int as n from (${sql}) t`, params);
  return res.rows[0].n;
}

beforeEach(async () => {
  db = await createTestDb();
  ownerId = await createUser(db);
  strangerId = await createUser(db);
  adminId = await createUser(db);
  pendingOwnerId = await createUser(db);
  await db.query("update profiles set role = 'admin' where id = $1", [adminId]);
  approvedShopId = await seedShop(ownerId, "approved-shop", "approved");
  pendingShopId = await seedShop(pendingOwnerId, "pending-shop", "pending");
});

describe("profiles", () => {
  it("lets a user read their own profile but not someone else's", async () => {
    await actAs(db, "authenticated", strangerId);
    expect(await count("select * from profiles where id = $1", [strangerId])).toBe(1);
    expect(await count("select * from profiles where id = $1", [ownerId])).toBe(0);
  });

  it("lets a user change their display name", async () => {
    await actAs(db, "authenticated", strangerId);
    const res = await db.query("update profiles set display_name = 'มิ้นท์' where id = $1", [strangerId]);
    expect(res.affectedRows).toBe(1);
  });

  it("never lets a user make themselves admin", async () => {
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(db.query("update profiles set role = 'admin' where id = $1", [strangerId]));
  });
});

describe("shops", () => {
  it("shows visitors approved shops only", async () => {
    await actAs(db, "anon");
    const res = await db.query<{ slug: string }>("select slug from shops");
    expect(res.rows.map((r) => r.slug)).toEqual(["approved-shop"]);
  });

  it("lets an owner see their own pending shop", async () => {
    await actAs(db, "authenticated", pendingOwnerId);
    expect(await count("select * from shops where id = $1", [pendingShopId])).toBe(1);
  });

  it("lets an admin see every shop", async () => {
    await actAs(db, "authenticated", adminId);
    expect(await count("select * from shops")).toBe(2);
  });

  it("lets a signed-in user apply for a shop as themselves", async () => {
    await actAs(db, "authenticated", strangerId);
    await db.query(
      "insert into shops (owner_id, slug, display_name, province, social_links) values ($1, 'new-shop', 'ร้านใหม่', 'เชียงใหม่', '{https://www.instagram.com/newshop}')",
      [strangerId],
    );
    await actAsSystem(db);
    expect(await count("select * from shops where slug = 'new-shop' and status = 'pending'")).toBe(1);
  });

  it("blocks applying for a shop on someone else's behalf", async () => {
    await actAs(db, "authenticated", strangerId);
    const someoneElse = pendingOwnerId;
    await expectBlockedByPolicy(
      db.query(
        "insert into shops (owner_id, slug, display_name, province) values ($1, 'fake-shop', 'ร้านปลอม', 'เชียงใหม่')",
        [someoneElse],
      ),
    );
  });

  it("blocks visitors from applying", async () => {
    await actAs(db, "anon");
    await expectBlockedByPolicy(
      db.query(
        "insert into shops (owner_id, slug, display_name, province) values ($1, 'anon-shop', 'ร้าน', 'เชียงใหม่')",
        [strangerId],
      ),
    );
  });

  it("blocks an applicant from approving themselves or setting commission", async () => {
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(
      db.query(
        "insert into shops (owner_id, slug, display_name, province, status) values ($1, 'self-ok', 'ร้าน', 'เชียงใหม่', 'approved')",
        [strangerId],
      ),
    );
    await actAs(db, "authenticated", pendingOwnerId);
    await expectBlockedByPolicy(db.query("update shops set status = 'approved' where id = $1", [pendingShopId]));
    await expectBlockedByPolicy(
      db.query("update shop_terms set commission_rate = 0 where shop_id = $1", [pendingShopId]),
    );
  });

  it("keeps commission terms private to the shop owner and admins", async () => {
    await actAs(db, "anon");
    await expectBlockedByPolicy(db.query("select * from shop_terms"));
    await actAs(db, "authenticated", strangerId);
    expect(await count("select * from shop_terms")).toBe(0);
    await actAs(db, "authenticated", ownerId);
    expect(await count("select * from shop_terms")).toBe(1);
    await actAs(db, "authenticated", adminId);
    expect(await count("select * from shop_terms")).toBe(2);
  });

  it("lets an owner edit their shop's profile", async () => {
    await actAs(db, "authenticated", ownerId);
    const res = await db.query("update shops set bio = 'วินเทจคัดมือ ย่านอารีย์' where id = $1", [approvedShopId]);
    expect(res.affectedRows).toBe(1);
  });

  it("does not let anyone edit a shop they do not own", async () => {
    await actAs(db, "authenticated", strangerId);
    const res = await db.query("update shops set bio = 'hacked' where id = $1", [approvedShopId]);
    expect(res.affectedRows).toBe(0);
  });
});

describe("products", () => {
  it("shows visitors listed items of approved shops, never drafts", async () => {
    await seedProduct(approvedShopId, "active", "active");
    await seedProduct(approvedShopId, "reserved", "reserved");
    await seedProduct(approvedShopId, "sold", "sold");
    await seedProduct(approvedShopId, "draft", "draft");
    await actAs(db, "anon");
    const res = await db.query<{ title: string }>("select title from products order by title");
    expect(res.rows.map((r) => r.title)).toEqual(["active", "reserved", "sold"]);
  });

  it("hides items of shops that are not approved", async () => {
    await seedProduct(pendingShopId, "active");
    await actAs(db, "anon");
    expect(await count("select * from products")).toBe(0);
  });

  it("lets an owner see their own drafts", async () => {
    await seedProduct(approvedShopId, "draft");
    await actAs(db, "authenticated", ownerId);
    expect(await count("select * from products where status = 'draft'")).toBe(1);
  });

  it("lets an approved shop add an item", async () => {
    await actAs(db, "authenticated", ownerId);
    await db.query(
      `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws)
       values ($1, 'แจ็กเก็ต Carhartt', 'outerwear', 'L', 150000, 'good', false)`,
      [approvedShopId],
    );
  });

  it("blocks a pending shop from adding items", async () => {
    await actAs(db, "authenticated", pendingOwnerId);
    await expectBlockedByPolicy(
      db.query(
        `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws)
         values ($1, 'เสื้อ', 'tops', 'M', 50000, 'good', false)`,
        [pendingShopId],
      ),
    );
  });

  it("blocks adding items to someone else's shop", async () => {
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(
      db.query(
        `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws)
         values ($1, 'เสื้อ', 'tops', 'M', 50000, 'good', false)`,
        [approvedShopId],
      ),
    );
  });

  it("lets an owner mark an item sold", async () => {
    const id = await seedProduct(approvedShopId, "active");
    await actAs(db, "authenticated", ownerId);
    const res = await db.query("update products set status = 'sold', sold_at = now() where id = $1", [id]);
    expect(res.affectedRows).toBe(1);
  });

  it("never lets an owner set an item to reserved (only the offer system does)", async () => {
    const id = await seedProduct(approvedShopId, "active");
    await actAs(db, "authenticated", ownerId);
    await expectBlockedByPolicy(db.query("update products set status = 'reserved' where id = $1", [id]));
  });

  it("does not let others edit or delete an item", async () => {
    const id = await seedProduct(approvedShopId, "active");
    await actAs(db, "authenticated", strangerId);
    expect((await db.query("update products set price_satang = 1 where id = $1", [id])).affectedRows).toBe(0);
    expect((await db.query("delete from products where id = $1", [id])).affectedRows).toBe(0);
  });
});

describe("product images", () => {
  it("follow the visibility of their product", async () => {
    const live = await seedProduct(approvedShopId, "active"); // comes with its required photos
    const draft = await seedProduct(approvedShopId, "draft");
    await db.query("insert into product_images (product_id, kind, storage_path) values ($1, 'front', 'x.webp')", [draft]);
    await actAs(db, "anon");
    const res = await db.query<{ product_id: string }>("select distinct product_id from product_images");
    expect(res.rows.map((r) => r.product_id)).toEqual([live]);
  });

  it("can only be added by the product's owner", async () => {
    const id = await seedProduct(approvedShopId, "draft");
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(
      db.query("insert into product_images (product_id, kind, storage_path) values ($1, 'front', 'x.webp')", [id]),
    );
    await actAs(db, "authenticated", ownerId);
    await db.query("insert into product_images (product_id, kind, storage_path) values ($1, 'front', 'x.webp')", [id]);
  });
});

describe("styles", () => {
  it("are readable by everyone and writable by no one", async () => {
    await actAs(db, "anon");
    expect(await count("select * from styles")).toBe(6);
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(db.query("insert into styles (slug, name_th, name_en) values ('x', 'x', 'x')"));
  });

  it("can be tagged on an item only by its owner", async () => {
    const id = await seedProduct(approvedShopId, "draft");
    const style = (await db.query<{ id: string }>("select id from styles where slug = 'vintage'")).rows[0].id;
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(
      db.query("insert into product_styles (product_id, style_id) values ($1, $2)", [id, style]),
    );
    await actAs(db, "authenticated", ownerId);
    await db.query("insert into product_styles (product_id, style_id) values ($1, $2)", [id, style]);
  });

  it("can be tagged on a shop only by its owner", async () => {
    const style = (await db.query<{ id: string }>("select id from styles where slug = 'vintage'")).rows[0].id;
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(
      db.query("insert into shop_styles (shop_id, style_id) values ($1, $2)", [approvedShopId, style]),
    );
    await actAs(db, "authenticated", ownerId);
    await db.query("insert into shop_styles (shop_id, style_id) values ($1, $2)", [approvedShopId, style]);
  });
});

describe("reports", () => {
  const insertWebsiteReport = (reporter: string) =>
    db.query(
      "insert into reports (reporter_id, target_type, reason, details) values ($1, 'website', 'bug', 'หน้าค้นหาโหลดไม่ขึ้นเลย')",
      [reporter],
    );

  it("lets a signed-in user file a report as themselves", async () => {
    await actAs(db, "authenticated", strangerId);
    await insertWebsiteReport(strangerId);
  });

  it("blocks visitors and impersonation", async () => {
    await actAs(db, "anon");
    await expectBlockedByPolicy(insertWebsiteReport(strangerId));
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(insertWebsiteReport(ownerId));
  });

  it("blocks a reporter from closing their own report or writing admin notes", async () => {
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(
      db.query(
        "insert into reports (reporter_id, target_type, reason, details, status, resolved_at) values ($1, 'website', 'bug', 'หน้าค้นหาโหลดไม่ขึ้นเลย', 'closed', now())",
        [strangerId],
      ),
    );
  });

  it("shows users their own reports, and admins all reports", async () => {
    await actAs(db, "authenticated", strangerId);
    await insertWebsiteReport(strangerId);
    await actAs(db, "authenticated", ownerId);
    await insertWebsiteReport(ownerId);
    expect(await count("select * from reports")).toBe(1);
    await actAs(db, "authenticated", adminId);
    expect(await count("select * from reports")).toBe(2);
  });
});
