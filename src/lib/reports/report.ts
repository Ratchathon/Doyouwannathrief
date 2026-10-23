// Mirrors the reason_fits_target constraint on public.reports.
export const REPORT_REASONS = {
  product: {
    counterfeit: "สงสัยว่าเป็นของปลอม",
    not_as_described: "ของไม่ตรงกับรูปหรือคำอธิบาย",
    prohibited_item: "เป็นสินค้าที่ไม่ควรขาย",
    other: "อื่นๆ",
  },
  shop: {
    shop_behavior: "ร้านมีพฤติกรรมไม่เหมาะสม",
    counterfeit: "ร้านขายของปลอม",
    other: "อื่นๆ",
  },
  website: {
    bug: "เว็บใช้งานไม่ได้หรือแสดงผิด",
    other: "อื่นๆ",
  },
} as const;

export const REPORT_STATUS_LABELS = {
  open: "รับเรื่องแล้ว",
  in_review: "กำลังตรวจสอบ",
  closed: "ปิดเรื่องแล้ว",
} as const;

export type ReportTarget = keyof typeof REPORT_REASONS;
export type ReportStatus = keyof typeof REPORT_STATUS_LABELS;

export type ReportInput = { targetType: string; targetId: string; reason: string; details: string };
export type ReportRow = {
  target_type: ReportTarget;
  product_id: string | null;
  shop_id: string | null;
  reason: string;
  details: string;
};

const DETAILS_MIN = 10;
const DETAILS_MAX = 2000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isReportStatus(value: string): value is ReportStatus {
  return Object.hasOwn(REPORT_STATUS_LABELS, value);
}

export function validateReport(
  input: ReportInput,
): { ok: true; value: ReportRow } | { ok: false; errors: Partial<Record<keyof ReportInput, string>> } {
  const errors: Partial<Record<keyof ReportInput, string>> = {};

  const target = input.targetType;
  const knownTarget = Object.hasOwn(REPORT_REASONS, target);
  const needsId = target === "product" || target === "shop";
  if (!knownTarget || (needsId && !UUID.test(input.targetId))) {
    errors.targetType = "ไม่รู้ว่าจะแจ้งเรื่องอะไร ลองเปิดหน้าแจ้งปัญหาจากหน้าสินค้าหรือหน้าร้านอีกครั้ง";
  }

  const reasons: Record<string, string> = knownTarget ? REPORT_REASONS[target as ReportTarget] : {};
  if (!Object.hasOwn(reasons, input.reason)) errors.reason = "เลือกเหตุผลที่แจ้ง";

  const details = input.details.trim();
  if (details.length < DETAILS_MIN) errors.details = `เล่ารายละเอียดอย่างน้อย ${DETAILS_MIN} ตัวอักษร จะช่วยให้ตรวจสอบได้เร็วขึ้น`;
  else if (details.length > DETAILS_MAX) errors.details = `รายละเอียดยาวได้ไม่เกิน ${DETAILS_MAX} ตัวอักษร`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const targetType = target as ReportTarget;
  return {
    ok: true,
    value: {
      target_type: targetType,
      product_id: targetType === "product" ? input.targetId : null,
      shop_id: targetType === "shop" ? input.targetId : null,
      reason: input.reason,
      details,
    },
  };
}
