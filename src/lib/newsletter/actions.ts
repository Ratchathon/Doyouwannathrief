"use server";

import type { NewsletterState } from "@/components/newsletter-form";
import { validateEmail } from "@/lib/auth/credentials";
import { createClient } from "@/lib/supabase/server";

export async function subscribeNewsletter(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const raw = form.get("email");
  const checked = validateEmail(typeof raw === "string" ? raw : "");
  if (!checked.ok) return { status: "error", message: "ใส่อีเมลให้ถูกต้อง เช่น name@example.com" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("subscribe_newsletter", { p_email: checked.value });
  if (error) return { status: "error", message: "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง" };

  return { status: "done", message: "ขอบคุณ! เราจะส่งร้านใหม่และของเด็ดประจำสัปดาห์ไปที่อีเมลนี้" };
}
