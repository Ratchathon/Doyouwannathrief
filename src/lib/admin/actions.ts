"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function resetDemo(): Promise<{ error: string | null; message?: string }> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_demo");
  if (error) return { error: "รีเซ็ตไม่สำเร็จ ลองใหม่อีกครั้ง" };
  revalidatePath("/", "layout");
  return { error: null, message: "รีเซ็ตข้อมูลเดโมแล้ว" };
}
