"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { isReportStatus, validateReport, type ReportInput } from "@/lib/reports/report";
import { createClient } from "@/lib/supabase/server";

export type ReportFormState = {
  error: string | null;
  sent?: boolean;
  fieldErrors?: Partial<Record<keyof ReportInput, string>>;
};
export type SimpleState = { error: string | null };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export async function fileReport(_prev: ReportFormState | null, form: FormData): Promise<ReportFormState> {
  const userId = await requireUser("/report");

  const result = validateReport({
    targetType: text(form, "targetType"),
    targetId: text(form, "targetId"),
    reason: text(form, "reason"),
    details: text(form, "details"),
  });
  if (!result.ok) return { error: null, fieldErrors: result.errors };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({ reporter_id: userId, ...result.value });

  if (error?.code === "23514" && error.message?.includes("Too many reports")) {
    return { error: "แจ้งปัญหาได้ไม่เกิน 5 เรื่องต่อชั่วโมง รอสักครู่แล้วลองใหม่" };
  }
  if (error) return { error: "ส่งเรื่องไม่สำเร็จ ลองใหม่อีกครั้ง" };

  return { error: null, sent: true };
}

export async function updateReport(_prev: SimpleState | null, form: FormData): Promise<SimpleState> {
  await requireAdmin();

  const status = text(form, "status");
  if (!isReportStatus(status)) return { error: "เลือกสถานะของเรื่อง" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_report", {
    p_report_id: text(form, "reportId"),
    p_status: status,
    p_note: text(form, "note").trim() || null,
  });
  if (error) return { error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };

  revalidatePath("/admin/reports");
  return { error: null };
}
