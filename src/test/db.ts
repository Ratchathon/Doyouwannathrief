import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/**
 * The parts of Supabase that our migrations depend on but plain Postgres lacks:
 * the auth schema, auth.uid(), the anon/authenticated roles, and a minimal
 * storage schema (buckets, objects with RLS on, storage.foldername()).
 * auth.uid() reads a session setting so tests can act as any user.
 */
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id),
    name text, owner uuid default auth.uid(),
    unique (bucket_id, name)
  );
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
  $$;
  grant usage on schema storage to anon, authenticated;
  grant select, insert, update, delete on storage.objects to anon, authenticated;
  grant select on storage.buckets to anon, authenticated;
`;

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function buildMigratedDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

// Starting Postgres is the slow part (~2.5s); loading a snapshot is ~0.4s.
// So each test worker migrates once, snapshots, and every test starts from a
// fresh copy of that snapshot. Tests stay fully isolated.
let snapshot: Promise<File | Blob> | null = null;
const openDbs = new Set<PGlite>();

function migratedSnapshot(): Promise<File | Blob> {
  snapshot ??= buildMigratedDb().then(async (db) => {
    const dump = await db.dumpDataDir("none");
    await db.close();
    return dump;
  });
  return snapshot;
}

/** A fresh in-memory Postgres with every migration applied, in order. */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite({ loadDataDir: await migratedSnapshot() });
  await db.waitReady;
  openDbs.add(db);
  return db;
}

/** Frees databases created by the finished test. Called from vitest.setup.ts. */
export async function closeTestDbs(): Promise<void> {
  const dbs = [...openDbs];
  openDbs.clear();
  await Promise.all(dbs.map((db) => db.close().catch(() => undefined)));
}
globalThis.__closeTestDbs = closeTestDbs;

/** Inserts an auth user plus its profile row (created by trigger) and returns the id. */
export async function createUser(db: PGlite, email = `${crypto.randomUUID()}@test.dev`): Promise<string> {
  const res = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
  return res.rows[0].id;
}

/** Runs queries as a specific Supabase role, optionally as a logged-in user. */
export async function actAs(db: PGlite, role: "anon" | "authenticated", userId?: string): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(`set role ${role}`);
}

/**
 * Asserts the database refused the write because of a data rule, not for an
 * unrelated reason like a missing table. Postgres class 23 is integrity
 * constraint violation; 22P02 is an invalid enum or type value.
 */
export async function expectRejectedByRule(write: Promise<unknown>): Promise<void> {
  let error: unknown;
  try {
    await write;
  } catch (e) {
    error = e;
  }
  if (!error) throw new Error("Expected the database to reject the write, but it succeeded");
  const code = (error as { code?: string }).code ?? "";
  if (!(code.startsWith("23") || code === "22P02")) {
    throw new Error(`Expected a data-rule violation, got ${code || "no code"}: ${(error as Error).message}`);
  }
}

/** Asserts row level security blocked the write (Postgres 42501). */
export async function expectBlockedByPolicy(write: Promise<unknown>): Promise<void> {
  let error: unknown;
  try {
    await write;
  } catch (e) {
    error = e;
  }
  if (!error) throw new Error("Expected row level security to block the write, but it succeeded");
  const code = (error as { code?: string }).code ?? "";
  if (code !== "42501") {
    throw new Error(`Expected a policy violation (42501), got ${code || "no code"}: ${(error as Error).message}`);
  }
}

/** Back to the superuser, which bypasses row level security. */
export async function actAsSystem(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}

type ProductStatus = "draft" | "active" | "reserved" | "sold";

/**
 * Creates an item the way the app does: as a draft, with the required
 * photos, then moved to `status`. Runs as the system (bypassing RLS).
 */
export async function createProduct(
  db: PGlite,
  shopId: string,
  status: ProductStatus = "draft",
  title = "เสื้อ",
): Promise<string> {
  const res = await db.query<{ id: string }>(
    `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws)
     values ($1, $2, 'tops', 'M', 50000, 'good', false) returning id`,
    [shopId, title],
  );
  const id = res.rows[0].id;
  if (status === "draft") return id;

  for (const kind of ["front", "back", "label"]) {
    await db.query("insert into product_images (product_id, kind, storage_path) values ($1, $2, $3)", [
      id,
      kind,
      `${id}/${kind}.webp`,
    ]);
  }
  await db.query("update products set status = 'active' where id = $1", [id]);
  if (status === "reserved") await db.query("update products set status = 'reserved' where id = $1", [id]);
  if (status === "sold") await db.query("update products set status = 'sold', sold_at = now() where id = $1", [id]);
  return id;
}
