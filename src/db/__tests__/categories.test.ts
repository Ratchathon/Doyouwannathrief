// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/products/listing";
import { createTestDb } from "@/test/db";

describe("product categories in the database", () => {
  it("match the app's list, in the same order", async () => {
    const db = await createTestDb();
    const res = await db.query<{ value: string }>(
      "select unnest(enum_range(null::public.product_category))::text as value",
    );
    expect(res.rows.map((r) => r.value)).toEqual(Object.keys(CATEGORIES));
  });
});
