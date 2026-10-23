// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createTestDb, expectBlockedByPolicy, expectRejectedByRule } from "@/test/db";

let db: PGlite;

const subscribe = (email: string) => db.query("select public.subscribe_newsletter($1)", [email]);

async function stored() {
  await actAsSystem(db);
  const res = await db.query<{ email: string }>("select email from newsletter_subscribers order by email");
  return res.rows.map((r) => r.email);
}

beforeEach(async () => {
  db = await createTestDb();
});

describe("newsletter sign-up", () => {
  it("lets a visitor subscribe, storing the email trimmed and lower-case", async () => {
    await actAs(db, "anon");
    await subscribe("  Fan@Example.COM ");
    expect(await stored()).toEqual(["fan@example.com"]);
  });

  it("quietly accepts the same email twice", async () => {
    await actAs(db, "anon");
    await subscribe("fan@example.com");
    await subscribe("FAN@example.com");
    expect(await stored()).toEqual(["fan@example.com"]);
  });

  it.each(["", "not-an-email", "a@b", `${"x".repeat(250)}@example.com`])("rejects %j", async (email) => {
    await actAs(db, "anon");
    await expectRejectedByRule(subscribe(email));
  });

  it("never lets the browser read or write the list directly", async () => {
    await actAs(db, "anon");
    await expectBlockedByPolicy(db.query("select email from newsletter_subscribers"));
    await expectBlockedByPolicy(db.query("insert into newsletter_subscribers (email) values ('x@example.com')"));
  });
});
