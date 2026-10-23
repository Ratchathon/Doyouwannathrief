import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

/**
 * The parts of Supabase that our migrations depend on but plain Postgres lacks:
 * the auth schema, auth.uid(), and the anon/authenticated roles.
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
