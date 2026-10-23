import { describe, expect, it } from "vitest";
import { REPORT_REASONS, REPORT_STATUS_LABELS, validateReport } from "@/lib/reports/report";

const ID = "22222222-2222-4222-8222-222222222222";

describe("REPORT_REASONS", () => {
  it("offers reasons that fit each kind of report, in Thai", () => {
    expect(Object.keys(REPORT_REASONS.product)).toEqual(["counterfeit", "not_as_described", "prohibited_item", "other"]);
    expect(Object.keys(REPORT_REASONS.shop)).toEqual(["shop_behavior", "counterfeit", "other"]);
    expect(Object.keys(REPORT_REASONS.website)).toEqual(["bug", "other"]);
    for (const reasons of Object.values(REPORT_REASONS)) {
      for (const label of Object.values(reasons)) expect(label).toMatch(/[฀-๿]/);
    }
  });

  it("labels every status in Thai", () => {
    expect(Object.keys(REPORT_STATUS_LABELS)).toEqual(["open", "in_review", "closed"]);
  });
});

describe("validateReport", () => {
  it("accepts a product report", () => {
    expect(
      validateReport({ targetType: "product", targetId: ID, reason: "counterfeit", details: "  ป้ายคอดูไม่เหมือนของแท้  " }),
    ).toEqual({
      ok: true,
      value: { target_type: "product", product_id: ID, shop_id: null, reason: "counterfeit", details: "ป้ายคอดูไม่เหมือนของแท้" },
    });
  });

  it("accepts a website report without a target", () => {
    const result = validateReport({ targetType: "website", targetId: "", reason: "bug", details: "หน้าค้นหาโหลดไม่ขึ้น" });
    expect(result.ok && result.value).toMatchObject({ product_id: null, shop_id: null });
  });

  it("points a shop report at the shop", () => {
    const result = validateReport({ targetType: "shop", targetId: ID, reason: "shop_behavior", details: "ร้านไม่ส่งของมาสองอาทิตย์แล้ว" });
    expect(result.ok && result.value).toMatchObject({ shop_id: ID, product_id: null });
  });

  it.each([
    [{ targetType: "spaceship" }, "targetType"],
    [{ targetType: "product", targetId: "" }, "targetType"],
    [{ targetType: "product", targetId: "not-a-uuid" }, "targetType"],
    [{ reason: "bug" }, "reason"],
    [{ details: "แย่" }, "details"],
    [{ details: "ก".repeat(2001) }, "details"],
  ])("rejects %j", (change, field) => {
    const base = { targetType: "product", targetId: ID, reason: "counterfeit", details: "ป้ายคอดูไม่เหมือนของแท้" };
    const result = validateReport({ ...base, ...change });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[field as keyof typeof result.errors]).toMatch(/[฀-๿]/);
  });
});
