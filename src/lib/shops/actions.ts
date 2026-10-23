"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { validateShopApplication, type ShopApplicationInput } from "@/lib/shops/application";
import { createClient } from "@/lib/supabase/server";

type DbError = { code?: string; message?: string } | null;

export type ApplyState = {
  error: string | null;
  fieldErrors?: Partial<Record<keyof ShopApplicationInput, string>>;
  values?: ShopApplicationInput;
};

export type SimpleState = { error: string | null };

const GENERIC_ERROR = "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง";

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function list(form: FormData, key: string): string[] {
  return form.getAll(key).filter((v): v is string => typeof v === "string");
}

function violates(error: DbError, constraint: string): boolean {
  return error?.code === "23505" && Boolean(error.message?.includes(constraint));
}

export async function applyForShop(_prev: ApplyState | null, form: FormData): Promise<ApplyState> {
  await requireUser("/sell/apply");

  const values: ShopApplicationInput = {
    displayName: text(form, "displayName"),
    slug: text(form, "slug"),
    province: text(form, "province"),
    bio: text(form, "bio"),
    styles: list(form, "styles"),
    socialLinks: list(form, "socialLinks"),
  };

  const result = validateShopApplication(values);
  if (!result.ok) return { error: null, fieldErrors: result.errors, values };

  const app = result.value;
  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_for_shop", {
    p_slug: app.slug,
    p_display_name: app.displayName,
    p_province: app.province,
    p_bio: app.bio,
    p_social_links: app.socialLinks,
    p_style_slugs: app.styles,
  });

  if (violates(error, "shops_slug_key")) {
    return { error: null, fieldErrors: { slug: "มีร้านใช้ชื่อลิงก์นี้แล้ว ลองชื่ออื่น" }, values };
  }
  if (violates(error, "shops_owner_id_key")) {
    return { error: "บัญชีนี้มีร้านอยู่แล้ว หนึ่งบัญชีเปิดได้หนึ่งร้าน", values };
  }
  if (error) return { error: GENERIC_ERROR, values };

  redirect("/sell");
}

export async function resubmitShop(_prev: SimpleState | null, form: FormData): Promise<SimpleState> {
  await requireUser("/sell");

  const supabase = await createClient();
  const { error } = await supabase.rpc("resubmit_shop", { p_shop_id: text(form, "shopId") });

  if (error) {
    const date = error.message?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    return { error: date ? `ส่งสมัครใหม่ได้ตั้งแต่วันที่ ${date}` : GENERIC_ERROR };
  }

  revalidatePath("/sell");
  return { error: null };
}

export async function reviewShop(_prev: SimpleState | null, form: FormData): Promise<SimpleState> {
  await requireAdmin();

  const decision = text(form, "decision");
  if (decision !== "approve" && decision !== "reject") return { error: "เลือกอนุมัติหรือปฏิเสธ" };

  const reason = text(form, "reason").trim();
  if (decision === "reject" && !reason) return { error: "ใส่เหตุผลที่ปฏิเสธ ร้านจะเห็นข้อความนี้" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_shop", {
    p_shop_id: text(form, "shopId"),
    p_approve: decision === "approve",
    p_reason: decision === "reject" ? reason : null,
  });
  if (error) return { error: GENERIC_ERROR };

  revalidatePath("/admin/shops");
  return { error: null };
}
