// @vitest-environment node
// Supabase runs pg-safeupdate for API requests: a DELETE or UPDATE without a
// WHERE clause is refused, even inside a security definer function. PGlite has
// no such guard, so this test checks the latest version of every function.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "supabase/migrations");

function latestFunctionBodies() {
  const bodies = new Map<string, string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, file), "utf8");
    for (const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\([\s\S]*?\$\$([\s\S]*?)\$\$/gi)) {
      bodies.set(m[1], m[2]);
    }
  }
  return bodies;
}

function unguardedWrites(body: string) {
  const code = body.replace(/--.*$/gm, "");
  const writes = code.match(/\b(?:delete\s+from|update)\s+public\.[^;]*;/gi) ?? [];
  return writes.filter((s) => !/\bwhere\b/i.test(s)).map((s) => s.replace(/\s+/g, " ").trim());
}

describe("database functions", () => {
  it("never delete or update without a WHERE clause", () => {
    const offenders: string[] = [];
    for (const [name, body] of latestFunctionBodies()) {
      for (const s of unguardedWrites(body)) offenders.push(`${name}: ${s}`);
    }
    expect(offenders).toEqual([]);
  });

  it("finds the writes it is meant to check", () => {
    expect(unguardedWrites("delete from public.orders; update public.x set a = 1 where id = 2;")).toEqual(["delete from public.orders;"]);
  });
});
