// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createTestDb, createUser } from "@/test/db";

const ROOT = process.cwd();
const ADD = readFileSync(join(ROOT, "supabase/seed/sample-shops.sql"), "utf8");
const REMOVE = readFileSync(join(ROOT, "supabase/seed/remove-sample-shops.sql"), "utf8");

let db: PGlite;

// The test stub's auth.users has only id and email; Supabase's has these too.
async function withSupabaseUserColumns() {
  await db.exec(`
    alter table auth.users
      add column instance_id uuid, add column aud text, add column role text,
      add column encrypted_password text, add column email_confirmed_at timestamptz,
      add column raw_app_meta_data jsonb, add column raw_user_meta_data jsonb,
      add column created_at timestamptz, add column updated_at timestamptz,
      add column confirmation_token text, add column recovery_token text,
      add column email_change_token_new text, add column email_change text;
  `);
}

async function count(sql: string) {
  const res = await db.query<{ n: number }>(`select (${sql})::int as n`);
  return res.rows[0].n;
}

beforeEach(async () => {
  db = await createTestDb();
  await withSupabaseUserColumns();
});

describe("sample shops", () => {
  it("adds six approved shops with items on sale, one sold and one reserved", async () => {
    await db.exec(ADD);
    expect(await count("select count(*) from shops where status = 'approved'")).toBe(6);
    expect(await count("select count(*) from products")).toBe(36);
    expect(await count("select count(*) from products where status = 'sold'")).toBe(2);
    expect(await count("select count(*) from products where status = 'reserved'")).toBe(1);
    expect(await count("select count(*) from products where status = 'draft'")).toBe(0);
  });

  it("is visible to visitors through search", async () => {
    await db.exec(ADD);
    await actAs(db, "anon");
    const polo = await db.query<{ shop_slug: string }>("select shop_slug from search_products(p_query => 'polo')");
    expect(polo.rows.map((r) => r.shop_slug)).toContain("second-season");
    const shops = await db.query("select slug from search_related_shops(p_style => 'vintage')");
    expect(shops.rows.length).toBeGreaterThan(0);
    await actAsSystem(db);
  });

  it("points every photo at a file that ships with the site", async () => {
    await db.exec(ADD);
    const res = await db.query<{ storage_path: string }>("select storage_path from product_images");
    expect(res.rows.length).toBeGreaterThan(100);
    for (const { storage_path } of res.rows) {
      expect(storage_path.startsWith("samples/")).toBe(true);
      expect(existsSync(join(ROOT, "public", storage_path)), storage_path).toBe(true);
    }
  });

  it("can be run twice without errors or duplicates", async () => {
    await db.exec(ADD);
    await db.exec(ADD);
    expect(await count("select count(*) from products")).toBe(36);
    expect(await count("select count(*) from product_images")).toBe(
      await count("select count(distinct (product_id, kind)) from product_images"),
    );
  });

  it("is removed completely, leaving real shops alone", async () => {
    const realOwner = await createUser(db, "real@example.com");
    await db.query(
      "insert into shops (owner_id, slug, display_name, province, status, approved_at) values ($1, 'real-shop', 'REAL', 'ภูเก็ต', 'approved', now())",
      [realOwner],
    );
    await db.exec(ADD);
    await db.exec(REMOVE);
    expect(await count("select count(*) from shops")).toBe(1);
    expect(await count("select count(*) from products")).toBe(0);
    expect(await count("select count(*) from auth.users where email like '%sample%'")).toBe(0);
    expect(await count("select count(*) from auth.users")).toBe(1);
  });
});
