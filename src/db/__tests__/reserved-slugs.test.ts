// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS } from "@/lib/shops/slug";
import { createTestDb, createUser, expectRejectedByRule } from "@/test/db";

describe("reserved slugs in the database", () => {
  it("match the list the app uses", async () => {
    const db = await createTestDb();
    const res = await db.query<{ slug: string }>("select unnest(public.reserved_slugs()) as slug order by 1");
    expect(res.rows.map((r) => r.slug)).toEqual([...RESERVED_SLUGS].sort());
  });

  it("cannot be registered even by writing to the database directly", async () => {
    const db = await createTestDb();
    const owner = await createUser(db);
    await expectRejectedByRule(
      db.query("insert into shops (owner_id, slug, display_name, province) values ($1, 'admin', 'แอดมิน', 'กรุงเทพมหานคร')", [owner]),
    );
  });
});
