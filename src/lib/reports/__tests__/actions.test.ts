// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const insert = vi.fn();
const rpc = vi.fn();
const revalidatePath = vi.fn();
let isAdmin = false;

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: () => ({ insert }), rpc }),
}));
class NotFound extends Error {}
vi.mock("@/lib/auth/guards", () => ({
  requireUser: async () => "user-1",
  requireAdmin: async () => {
    if (!isAdmin) throw new NotFound();
    return "admin-1";
  },
}));

const { fileReport, updateReport } = await import("@/lib/reports/actions");

const ID = "22222222-2222-4222-8222-222222222222";
function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}
const validForm = { targetType: "product", targetId: ID, reason: "counterfeit", details: "ป้ายคอดูไม่เหมือนของแท้" };

beforeEach(() => {
  vi.clearAllMocks();
  isAdmin = false;
  insert.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ error: null });
});

describe("fileReport", () => {
  it("files the report as the signed-in user", async () => {
    expect(await fileReport(null, form(validForm))).toEqual({ error: null, sent: true });
    expect(insert).toHaveBeenCalledWith({
      reporter_id: "user-1",
      target_type: "product",
      product_id: ID,
      shop_id: null,
      reason: "counterfeit",
      details: "ป้ายคอดูไม่เหมือนของแท้",
    });
  });

  it("returns field errors without filing", async () => {
    const state = await fileReport(null, form({ ...validForm, details: "แย่" }));
    expect(state.fieldErrors?.details).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });

  it("asks people who report too often to wait", async () => {
    insert.mockResolvedValue({ error: { code: "23514", message: "Too many reports in the last hour" } });
    expect((await fileReport(null, form(validForm))).error).toMatch(/ชั่วโมง/);
  });
});

describe("updateReport", () => {
  it("is invisible to non-admins", async () => {
    await expect(updateReport(null, form({ reportId: ID, status: "closed" }))).rejects.toBeInstanceOf(NotFound);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("updates status and note", async () => {
    isAdmin = true;
    expect(await updateReport(null, form({ reportId: ID, status: "closed", note: "แก้แล้ว" }))).toEqual({ error: null });
    expect(rpc).toHaveBeenCalledWith("admin_update_report", { p_report_id: ID, p_status: "closed", p_note: "แก้แล้ว" });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reports");
  });

  it("refuses unknown statuses", async () => {
    isAdmin = true;
    expect((await updateReport(null, form({ reportId: ID, status: "deleted" }))).error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});
