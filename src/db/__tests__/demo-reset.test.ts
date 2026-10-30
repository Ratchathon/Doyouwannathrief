// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createProduct, createTestDb, createUser } from "@/test/db";

let db: PGlite;
let admin: string;
let buyer: string;
let shopOwner: string;
let product: string;
let soldBySeed: string;

beforeEach(async () => {
  db = await createTestDb();
  admin = await createUser(db, "demo-admin@example.com");
  buyer = await createUser(db, "demo-buyer@example.com");
  shopOwner = await createUser(db, "demo-shop@example.com");
  await db.query("update profiles set role = 'admin' where id = $1", [admin]);
  const shop = await db.query<{ id: string }>(
    "insert into shops (owner_id, slug, display_name, province, status, approved_at) values ($1, 'tuekdaeng', 'T', 'กรุงเทพมหานคร', 'approved', now()) returning id",
    [shopOwner],
  );
  product = await createProduct(db, shop.rows[0].id, "active");
  soldBySeed = await createProduct(db, shop.rows[0].id, "sold");
});

describe("reset_demo", () => {
  it("clears what demo visitors did and puts their purchases back on sale", async () => {
    await actAs(db, "authenticated", buyer);
    const order = await db.query<{ id: string }>("select public.buy_now($1) as id", [product]);
    await db.query("select public.pay_order($1)", [order.rows[0].id]);
    await actAs(db, "authenticated", admin);
    await db.query("select public.reset_demo()");
    await actAsSystem(db);
    expect((await db.query("select * from orders")).rows).toHaveLength(0);
    expect((await db.query("select * from notifications")).rows).toHaveLength(0);
    const statuses = await db.query<{ id: string; status: string }>("select id, status from products");
    expect(statuses.rows.find((r) => r.id === product)!.status).toBe("active");
    expect(statuses.rows.find((r) => r.id === soldBySeed)!.status).toBe("sold");
  });

  it("is for admins only", async () => {
    await actAs(db, "authenticated", buyer);
    await expect(db.query("select public.reset_demo()")).rejects.toThrow(/admin/);
  });
});
