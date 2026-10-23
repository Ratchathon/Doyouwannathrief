// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, createProduct, createTestDb, createUser, expectBlockedByPolicy } from "@/test/db";

let db: PGlite;
let ownerId: string;
let otherOwnerId: string;
let shopId: string;
let otherShopId: string;
let productId: string;
let otherProductId: string;

const uuid = () => crypto.randomUUID();

async function makeShop(owner: string, slug: string) {
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, status, approved_at)
     values ($1, $2, 'ร้าน', 'กรุงเทพมหานคร', 'approved', now()) returning id`,
    [owner, slug],
  );
  return res.rows[0].id;
}

const upload = (name: string, bucket = "product-photos") =>
  db.query("insert into storage.objects (bucket_id, name) values ($1, $2)", [bucket, name]);

beforeEach(async () => {
  db = await createTestDb();
  ownerId = await createUser(db);
  otherOwnerId = await createUser(db);
  shopId = await makeShop(ownerId, "tuekdaeng");
  otherShopId = await makeShop(otherOwnerId, "othershop");
  productId = await createProduct(db, shopId);
  otherProductId = await createProduct(db, otherShopId);
});

describe("product-photos bucket", () => {
  it("is public to read and only takes WebP up to 5MB", async () => {
    const res = await db.query("select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'product-photos'");
    expect(res.rows[0]).toEqual({ public: true, file_size_limit: 5242880, allowed_mime_types: ["image/webp"] });
  });
});

describe("uploading photos", () => {
  it("lets a shop owner upload into their own item's folder", async () => {
    await actAs(db, "authenticated", ownerId);
    await upload(`${shopId}/${productId}/front-${uuid()}.webp`);
  });

  it("blocks uploading into another shop's folder", async () => {
    await actAs(db, "authenticated", ownerId);
    await expectBlockedByPolicy(upload(`${otherShopId}/${otherProductId}/front-${uuid()}.webp`));
  });

  it("blocks pairing your shop folder with someone else's item", async () => {
    await actAs(db, "authenticated", ownerId);
    await expectBlockedByPolicy(upload(`${shopId}/${otherProductId}/front-${uuid()}.webp`));
  });

  it.each([
    ["no kind prefix", () => `${shopId}/${productId}/${uuid()}.webp`],
    ["wrong extension", () => `${shopId}/${productId}/front-${uuid()}.jpg`],
    ["extra folder", () => `${shopId}/${productId}/x/front-${uuid()}.webp`],
    ["not a uuid", () => `tuekdaeng/${productId}/front-${uuid()}.webp`],
  ])("blocks a malformed path (%s)", async (_label, path) => {
    await actAs(db, "authenticated", ownerId);
    await expectBlockedByPolicy(upload(path()));
  });

  it("blocks visitors", async () => {
    await actAs(db, "anon");
    await expectBlockedByPolicy(upload(`${shopId}/${productId}/front-${uuid()}.webp`));
  });

  it("lets only the owner delete a photo file", async () => {
    const name = `${shopId}/${productId}/front-${uuid()}.webp`;
    await actAs(db, "authenticated", ownerId);
    await upload(name);
    await actAs(db, "authenticated", otherOwnerId);
    expect((await db.query("delete from storage.objects where name = $1", [name])).affectedRows).toBe(0);
    await actAs(db, "authenticated", ownerId);
    expect((await db.query("delete from storage.objects where name = $1", [name])).affectedRows).toBe(1);
  });

  it("does not affect other buckets", async () => {
    await db.query("insert into storage.buckets (id, name) values ('other', 'other')");
    await actAs(db, "authenticated", ownerId);
    await expectBlockedByPolicy(upload(`${shopId}/${productId}/front-${uuid()}.webp`, "other"));
  });
});
