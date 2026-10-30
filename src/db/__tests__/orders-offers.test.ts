// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createProduct, createTestDb, createUser } from "@/test/db";

let db: PGlite;
let owner: string;
let buyer: string;
let rival: string;
let shopId: string;
let product: string; // ฿500, on sale

beforeEach(async () => {
  db = await createTestDb();
  owner = await createUser(db);
  buyer = await createUser(db);
  rival = await createUser(db);
  const res = await db.query<{ id: string }>(
    "insert into shops (owner_id, slug, display_name, province, status, approved_at) values ($1, 'thrift', 'THRIFT', 'เชียงใหม่', 'approved', now()) returning id",
    [owner],
  );
  shopId = res.rows[0].id;
  product = await createProduct(db, shopId, "active", "ยีนส์");
});

async function as(user: string) {
  await actAs(db, "authenticated", user);
}
async function call<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
  const res = await db.query<{ r: T }>(`select ${sql} as r`, params);
  return res.rows[0].r;
}
async function fails(sql: string, params: unknown[], message: RegExp) {
  await expect(db.query(`select ${sql}`, params)).rejects.toThrow(message);
}
async function system<T>(sql: string, params: unknown[] = []) {
  await actAsSystem(db);
  return (await db.query<T>(sql, params)).rows;
}
const productStatus = async () => (await system<{ status: string }>("select status from products where id = $1", [product]))[0].status;
const notes = async (user: string) => (await system<{ kind: string }>("select kind from notifications where user_id = $1 order by created_at", [user])).map((n) => n.kind);

describe("buying now (demo payment)", () => {
  it("reserves the item for 10 hours while the buyer pays", async () => {
    await as(buyer);
    const orderId = await call<string>("public.buy_now($1)", [product]);
    const [order] = await system<{ status: string; price_satang: number; hours: number }>(
      "select status, price_satang, round(extract(epoch from pay_by - now()) / 3600) as hours from orders where id = $1",
      [orderId],
    );
    expect(order).toMatchObject({ status: "awaiting_payment", price_satang: 50000 });
    expect(Number(order.hours)).toBe(10);
    expect(await productStatus()).toBe("reserved");
  });

  it("refuses the shop's own items and items not on sale", async () => {
    await as(owner);
    await fails("public.buy_now($1)", [product], /own item/);
    await as(buyer);
    await call("public.buy_now($1)", [product]);
    await as(rival);
    await fails("public.buy_now($1)", [product], /not on sale/);
  });

  it("goes paid → shipped → completed, telling the other side each time", async () => {
    await as(buyer);
    const orderId = await call<string>("public.buy_now($1)", [product]);
    await call("public.pay_order($1)", [orderId]);
    expect(await productStatus()).toBe("sold");
    expect(await notes(owner)).toContain("order_paid");

    await as(rival);
    await fails("public.ship_order($1, $2)", [orderId, "TH123"], /not your order/);
    await as(owner);
    await call("public.ship_order($1, $2)", [orderId, "TH123"]);
    expect(await notes(buyer)).toContain("order_shipped");

    await as(buyer);
    await call("public.confirm_received($1)", [orderId]);
    const [order] = await system<{ status: string; tracking_number: string }>("select status, tracking_number from orders where id = $1", [orderId]);
    expect(order).toEqual({ status: "completed", tracking_number: "TH123" });
    expect(await notes(owner)).toContain("order_completed");
  });

  it("puts the item back on sale when payment time runs out", async () => {
    await as(buyer);
    const orderId = await call<string>("public.buy_now($1)", [product]);
    await system("update orders set pay_by = now() - interval '1 minute' where id = $1", [orderId]);
    await as(rival);
    await call("public.expire_stale()");
    expect(await productStatus()).toBe("active");
    expect((await system<{ status: string }>("select status from orders where id = $1", [orderId]))[0].status).toBe("cancelled");
    await as(buyer);
    await fails("public.pay_order($1)", [orderId], /no longer/);
  });

  it("shows an order only to its buyer and the shop", async () => {
    await as(buyer);
    await call("public.buy_now($1)", [product]);
    await as(rival);
    expect((await db.query("select * from orders")).rows).toHaveLength(0);
    await as(owner);
    expect((await db.query("select * from orders")).rows).toHaveLength(1);
  });
});

describe("offers", () => {
  it("turns away offers under the shop's floor without saying what it is", async () => {
    await as(buyer);
    expect(await call("public.make_offer($1, $2)", [product, 30000])).toBe("below_floor");
    expect(await call("public.make_offer($1, $2)", [product, 37500])).toBe("pending");
    await expect(db.query("select * from product_offer_floors")).rejects.toMatchObject({ code: "42501" });
  });

  it("lets the shop raise its floor above 75%, never below", async () => {
    await as(owner);
    await fails("public.set_offer_floor($1, $2)", [product, 30000], /at least 75%/);
    await call("public.set_offer_floor($1, $2)", [product, 45000]);
    await as(buyer);
    expect(await call("public.make_offer($1, $2)", [product, 40000])).toBe("below_floor");
  });

  it("keeps one live offer per item; a new one must beat it and the old buyer hears about it", async () => {
    await as(buyer);
    await call("public.make_offer($1, $2)", [product, 40000]);
    expect(await notes(owner)).toContain("offer_received");
    await as(rival);
    await fails("public.make_offer($1, $2)", [product, 40000], /beat/);
    expect(await call("public.make_offer($1, $2)", [product, 42000])).toBe("pending");
    expect(await notes(buyer)).toContain("offer_outbid");
    const live = await system<{ buyer_id: string }>("select buyer_id from offers where status in ('pending_shop', 'countered')");
    expect(live).toEqual([{ buyer_id: rival }]);
  });

  it("allows at most 3 offers per buyer per item", async () => {
    await as(buyer);
    await call("public.make_offer($1, $2)", [product, 38000]);
    await call("public.make_offer($1, $2)", [product, 39000]);
    await call("public.make_offer($1, $2)", [product, 40000]);
    await fails("public.make_offer($1, $2)", [product, 41000], /3 offers/);
  });

  it("supports up to 3 counter rounds, then the shop must accept or reject", async () => {
    await as(buyer);
    await call("public.make_offer($1, $2)", [product, 38000]);
    const offer = (await system<{ id: string }>("select id from offers"))[0].id;
    for (const [counter, raise] of [
      [48000, 39000],
      [47000, 40000],
      [46000, 41000],
    ]) {
      await as(owner);
      await call("public.respond_offer($1, 'counter', $2)", [offer, counter]);
      await as(buyer);
      await call("public.answer_counter($1, 'raise', $2)", [offer, raise]);
    }
    await as(owner);
    await fails("public.respond_offer($1, 'counter', $2)", [offer, 45000], /3 counter/);
    const orderId = await call<string>("public.respond_offer($1, 'accept', null)", [offer]);
    const [order] = await system<{ price_satang: number; status: string }>("select price_satang, status from orders where id = $1", [orderId]);
    expect(order).toEqual({ price_satang: 41000, status: "awaiting_payment" });
    expect(await productStatus()).toBe("reserved");
    expect(await notes(buyer)).toContain("offer_accepted");
  });

  it("lets the buyer accept a counter at the shop's price", async () => {
    await as(buyer);
    await call("public.make_offer($1, $2)", [product, 38000]);
    const offer = (await system<{ id: string }>("select id from offers"))[0].id;
    await as(owner);
    await call("public.respond_offer($1, 'counter', $2)", [offer, 45000]);
    await as(buyer);
    const orderId = await call<string>("public.answer_counter($1, 'accept', null)", [offer]);
    expect((await system<{ price_satang: number }>("select price_satang from orders where id = $1", [orderId]))[0].price_satang).toBe(45000);
  });

  it("expires an offer the shop does not answer within 24 hours", async () => {
    await as(buyer);
    await call("public.make_offer($1, $2)", [product, 40000]);
    await system("update offers set respond_by = now() - interval '1 minute'");
    await as(rival);
    await call("public.expire_stale()");
    expect((await system<{ status: string }>("select status from offers"))[0].status).toBe("expired");
    expect(await notes(buyer)).toContain("offer_expired");
  });

  it("shows offers only to the buyer and the shop", async () => {
    await as(buyer);
    await call("public.make_offer($1, $2)", [product, 40000]);
    await as(rival);
    expect((await db.query("select * from offers")).rows).toHaveLength(0);
    await as(owner);
    expect((await db.query("select * from offers")).rows).toHaveLength(1);
  });
});

describe("notifications", () => {
  it("are private and can be marked read", async () => {
    await as(buyer);
    await call("public.make_offer($1, $2)", [product, 40000]);
    await as(buyer);
    expect((await db.query("select * from notifications")).rows).toHaveLength(0);
    await as(owner);
    expect(await call<number>("public.mark_notifications_read()")).toBe(1);
    const [n] = (await db.query<{ read_at: string | null }>("select read_at from notifications")).rows;
    expect(n.read_at).not.toBeNull();
  });
});
