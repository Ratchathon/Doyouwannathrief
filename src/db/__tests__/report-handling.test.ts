// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { actAs, actAsSystem, createTestDb, createUser, expectBlockedByPolicy, expectRejectedByRule } from "@/test/db";

let db: PGlite;
let reporterId: string;
let adminId: string;

const fileReport = (reporter: string) =>
  db.query<{ id: string }>(
    "insert into reports (reporter_id, target_type, reason, details) values ($1, 'website', 'bug', 'ปุ่มค้นหากดแล้วไม่ทำงาน') returning id",
    [reporter],
  );

const handle = (id: string, status: string, note: string | null = null) =>
  db.query("select public.admin_update_report($1, $2::report_status, $3)", [id, status, note]);

beforeEach(async () => {
  db = await createTestDb();
  reporterId = await createUser(db);
  adminId = await createUser(db);
  await db.query("update profiles set role = 'admin' where id = $1", [adminId]);
});

describe("report limits", () => {
  it("allows 5 reports an hour per person, then asks them to wait", async () => {
    await actAs(db, "authenticated", reporterId);
    for (let i = 0; i < 5; i++) await fileReport(reporterId);
    await expectRejectedByRule(fileReport(reporterId));
  });

  it("counts only the last hour", async () => {
    await actAs(db, "authenticated", reporterId);
    for (let i = 0; i < 5; i++) await fileReport(reporterId);
    await actAsSystem(db);
    await db.query("update reports set created_at = now() - interval '61 minutes'");
    await actAs(db, "authenticated", reporterId);
    await fileReport(reporterId);
  });
});

describe("admin_update_report", () => {
  async function openReport() {
    await actAs(db, "authenticated", reporterId);
    const id = (await fileReport(reporterId)).rows[0].id;
    await actAsSystem(db);
    return id;
  }

  it("moves a report through review to closed, with a note", async () => {
    const id = await openReport();
    await actAs(db, "authenticated", adminId);
    await handle(id, "in_review");
    await handle(id, "closed", "แก้ไขแล้วในเวอร์ชันล่าสุด");
    await actAsSystem(db);
    const res = await db.query<{ status: string; admin_note: string; resolved_at: string | null }>(
      "select status, admin_note, resolved_at from reports where id = $1",
      [id],
    );
    expect(res.rows[0].status).toBe("closed");
    expect(res.rows[0].admin_note).toBe("แก้ไขแล้วในเวอร์ชันล่าสุด");
    expect(res.rows[0].resolved_at).not.toBeNull();
  });

  it("can reopen a closed report", async () => {
    const id = await openReport();
    await actAs(db, "authenticated", adminId);
    await handle(id, "closed", "ปิด");
    await handle(id, "in_review");
    await actAsSystem(db);
    const res = await db.query<{ resolved_at: string | null }>("select resolved_at from reports where id = $1", [id]);
    expect(res.rows[0].resolved_at).toBeNull();
  });

  it("keeps the existing note when none is given", async () => {
    const id = await openReport();
    await actAs(db, "authenticated", adminId);
    await handle(id, "in_review", "กำลังตรวจสอบกับร้าน");
    await handle(id, "closed");
    await actAsSystem(db);
    const res = await db.query<{ admin_note: string }>("select admin_note from reports where id = $1", [id]);
    expect(res.rows[0].admin_note).toBe("กำลังตรวจสอบกับร้าน");
  });

  it("is for admins only", async () => {
    const id = await openReport();
    await actAs(db, "authenticated", reporterId);
    await expectBlockedByPolicy(handle(id, "closed"));
  });
});

describe("report reasons", () => {
  it("must fit what is being reported", async () => {
    await expectRejectedByRule(
      db.query(
        "insert into reports (reporter_id, target_type, reason, details) values ($1, 'website', 'counterfeit', 'เว็บนี้ปลอมทั้งเว็บเลย')",
        [reporterId],
      ),
    );
  });
});

describe("reasons in the app and the database", () => {
  it("agree for every target and reason", async () => {
    const { REPORT_REASONS } = await import("@/lib/reports/report");
    const allReasons = ["counterfeit", "not_as_described", "prohibited_item", "shop_behavior", "bug", "other"];
    const shop = await db.query<{ id: string }>(
      `insert into shops (owner_id, slug, display_name, province) values ($1, 'shopx', 'ร้าน', 'กรุงเทพมหานคร') returning id`,
      [reporterId],
    );
    const product = await db.query<{ id: string }>(
      `insert into products (shop_id, title, category, size_label, price_satang, condition, has_flaws)
       values ($1, 'เสื้อ', 'tops_shirts', 'M', 100, 'good', false) returning id`,
      [shop.rows[0].id],
    );
    const ids = { product: product.rows[0].id, shop: shop.rows[0].id, website: null };

    for (const target of Object.keys(REPORT_REASONS) as (keyof typeof REPORT_REASONS)[]) {
      for (const reason of allReasons) {
        const reporter = await createUser(db); // fresh reporter, so the hourly limit never interferes
        const attempt = db.query(
          `insert into reports (reporter_id, target_type, product_id, shop_id, reason, details)
           values ($1, $2::report_target, $3, $4, $5::report_reason, 'รายละเอียดสำหรับทดสอบ')`,
          [reporter, target, target === "product" ? ids.product : null, target === "shop" ? ids.shop : null, reason],
        );
        if (Object.hasOwn(REPORT_REASONS[target], reason)) await attempt;
        else await expectRejectedByRule(attempt);
      }
    }
  });
});
