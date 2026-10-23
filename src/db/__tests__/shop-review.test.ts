// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createTestDb, createUser, expectBlockedByPolicy, expectRejectedByRule } from "@/test/db";

let db: PGlite;
let applicantId: string;
let adminId: string;
let strangerId: string;

const IG = "{https://www.instagram.com/tuekdaeng}";

async function apply(ownerId: string, slug = "tuekdaeng", links = IG) {
  await actAs(db, "authenticated", ownerId);
  const res = await db.query<{ id: string }>(
    `insert into shops (owner_id, slug, display_name, province, social_links)
     values ($1, $2, 'ร้านตึกแดง', 'กรุงเทพมหานคร', $3) returning id`,
    [ownerId, slug, links],
  );
  await actAsSystem(db);
  return res.rows[0].id;
}

async function shop(id: string) {
  const res = await db.query<{
    status: string;
    approved_at: string | null;
    rejected_at: string | null;
    rejection_reason: string | null;
  }>("select status, approved_at, rejected_at, rejection_reason from shops where id = $1", [id]);
  return res.rows[0];
}

const review = (shopId: string, approve: boolean, reason: string | null = null) =>
  db.query("select public.admin_review_shop($1, $2, $3)", [shopId, approve, reason]);

beforeEach(async () => {
  db = await createTestDb();
  applicantId = await createUser(db);
  adminId = await createUser(db);
  strangerId = await createUser(db);
  await db.query("update profiles set role = 'admin' where id = $1", [adminId]);
});

describe("applying", () => {
  it("requires at least one social link from the browser", async () => {
    await expectBlockedByPolicy(apply(applicantId, "tuekdaeng", "{}"));
  });

  it("accepts Instagram, TikTok and Facebook links", async () => {
    await apply(
      applicantId,
      "tuekdaeng",
      "{https://www.instagram.com/a,https://www.tiktok.com/@b,https://www.facebook.com/c}",
    );
  });

  it("refuses other sites and more than 3 links", async () => {
    await expectRejectedByRule(apply(applicantId, "tuekdaeng", "{https://evil.example/x}"));
    await expectRejectedByRule(apply(applicantId, "tuekdaeng", "{https://instagram.com.evil.example/x}"));
    await expectRejectedByRule(
      apply(
        applicantId,
        "tuekdaeng",
        "{https://instagram.com/a,https://instagram.com/b,https://instagram.com/c,https://instagram.com/d}",
      ),
    );
  });

  it("records when the application was submitted", async () => {
    const id = await apply(applicantId);
    const res = await db.query<{ submitted_at: string | null }>("select submitted_at from shops where id = $1", [id]);
    expect(res.rows[0].submitted_at).not.toBeNull();
  });
});

describe("admin_review_shop", () => {
  it("lets an admin approve a pending shop", async () => {
    const id = await apply(applicantId);
    await actAs(db, "authenticated", adminId);
    await review(id, true);
    await actAsSystem(db);
    const s = await shop(id);
    expect(s.status).toBe("approved");
    expect(s.approved_at).not.toBeNull();
  });

  it("lets an admin reject with a reason", async () => {
    const id = await apply(applicantId);
    await actAs(db, "authenticated", adminId);
    await review(id, false, "สินค้ายังเป็นเสื้อยืดทั่วไป ไม่ตรงแนวของเว็บ");
    await actAsSystem(db);
    const s = await shop(id);
    expect(s.status).toBe("rejected");
    expect(s.rejected_at).not.toBeNull();
    expect(s.rejection_reason).toBe("สินค้ายังเป็นเสื้อยืดทั่วไป ไม่ตรงแนวของเว็บ");
  });

  it("requires a reason to reject", async () => {
    const id = await apply(applicantId);
    await actAs(db, "authenticated", adminId);
    await expectRejectedByRule(review(id, false, "  "));
  });

  it("only reviews shops that are waiting", async () => {
    const id = await apply(applicantId);
    await actAs(db, "authenticated", adminId);
    await review(id, true);
    await expectRejectedByRule(review(id, false, "เปลี่ยนใจ"));
  });

  it("refuses everyone who is not an admin, including the applicant", async () => {
    const id = await apply(applicantId);
    for (const who of [applicantId, strangerId]) {
      await actAs(db, "authenticated", who);
      await expectBlockedByPolicy(review(id, true));
    }
    await actAs(db, "anon");
    await expectBlockedByPolicy(review(id, true));
  });
});

describe("resubmit_shop", () => {
  async function rejectedShop(daysAgo: number) {
    const id = await apply(applicantId);
    await actAs(db, "authenticated", adminId);
    await review(id, false, "ยังไม่ตรงแนว");
    await actAsSystem(db);
    await db.query(`update shops set rejected_at = now() - make_interval(days => $2) where id = $1`, [id, daysAgo]);
    return id;
  }

  const resubmit = (id: string) => db.query("select public.resubmit_shop($1)", [id]);

  it("puts a shop rejected 15 or more days ago back in the queue", async () => {
    const id = await rejectedShop(15);
    await actAs(db, "authenticated", applicantId);
    await resubmit(id);
    await actAsSystem(db);
    const s = await shop(id);
    expect(s.status).toBe("pending");
    expect(s.rejected_at).toBeNull();
  });

  it("refuses before 15 days have passed", async () => {
    const id = await rejectedShop(14);
    await actAs(db, "authenticated", applicantId);
    await expectRejectedByRule(resubmit(id));
  });

  it("only works for the shop's owner", async () => {
    const id = await rejectedShop(30);
    await actAs(db, "authenticated", strangerId);
    await expectBlockedByPolicy(resubmit(id));
  });

  it("only works for rejected shops", async () => {
    const id = await apply(applicantId);
    await actAs(db, "authenticated", applicantId);
    await expectRejectedByRule(resubmit(id));
  });

  it("lets the owner fix their details while rejected", async () => {
    const id = await rejectedShop(1);
    await actAs(db, "authenticated", applicantId);
    const res = await db.query(
      "update shops set bio = 'คัดเฉพาะวินเทจยุค 90', social_links = '{https://www.tiktok.com/@tuekdaeng}' where id = $1",
      [id],
    );
    expect(res.affectedRows).toBe(1);
  });
});

describe("apply_for_shop", () => {
  const applyRpc = (styles: string[], slug = "tuekdaeng", links = IG) =>
    db.query<{ apply_for_shop: string }>(
      "select public.apply_for_shop($1, 'ร้านตึกแดง', 'กรุงเทพมหานคร', 'วินเทจคัดมือ', $2, $3)",
      [slug, links, `{${styles.join(",")}}`],
    );

  it("creates the shop and its styles together, as the signed-in user", async () => {
    await actAs(db, "authenticated", applicantId);
    const res = await applyRpc(["vintage", "streetwear"]);
    const shopId = res.rows[0].apply_for_shop;
    await actAsSystem(db);
    const s = await db.query<{ owner_id: string; status: string }>("select owner_id, status from shops where id = $1", [shopId]);
    expect(s.rows[0]).toEqual({ owner_id: applicantId, status: "pending" });
    const styles = await db.query<{ slug: string }>(
      "select st.slug from shop_styles ss join styles st on st.id = ss.style_id where ss.shop_id = $1 order by st.slug",
      [shopId],
    );
    expect(styles.rows.map((r) => r.slug)).toEqual(["streetwear", "vintage"]);
  });

  it("saves nothing if a style does not exist", async () => {
    await actAs(db, "authenticated", applicantId);
    await expectRejectedByRule(applyRpc(["vintage", "spaceships"]));
    await actAsSystem(db);
    const n = await db.query("select count(*)::int as n from shops");
    expect(n.rows[0]).toEqual({ n: 0 });
  });

  it("requires 1 to 3 styles", async () => {
    await actAs(db, "authenticated", applicantId);
    await expectRejectedByRule(applyRpc([]));
    await expectRejectedByRule(applyRpc(["vintage", "streetwear", "y2k", "workwear"]));
  });

  it("refuses visitors who are not signed in", async () => {
    await actAs(db, "anon");
    await expectBlockedByPolicy(applyRpc(["vintage"]));
  });

  it("reports a taken slug as a uniqueness violation", async () => {
    await actAs(db, "authenticated", applicantId);
    await applyRpc(["vintage"], "tuekdaeng");
    await actAs(db, "authenticated", strangerId);
    const error = await applyRpc(["vintage"], "tuekdaeng").catch((e) => e);
    expect(error.code).toBe("23505");
    expect(error.constraint).toBe("shops_slug_key");
  });
});
