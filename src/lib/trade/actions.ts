"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { bahtToSatang, tradeError } from "@/lib/trade/errors";

export type TradeState = { error: string | null; message?: string };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function refresh() {
  for (const path of ["/account/orders", "/account/offers", "/sell/orders", "/sell/offers", "/account/notifications"]) {
    revalidatePath(path);
  }
}

async function run(name: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  return supabase.rpc(name, args);
}

export async function buyNow(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  const productId = text(form, "productId");
  await requireUser(text(form, "returnTo") || "/");
  const { data, error } = await run("buy_now", { p_product: productId });
  if (error || !data) return { error: tradeError(error ?? {}) };
  refresh();
  redirect(`/checkout/${data}`);
}

export async function payOrder(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/account/orders");
  const orderId = text(form, "orderId");
  const { error } = await run("pay_order", { p_order: orderId });
  if (error) return { error: tradeError(error) };
  refresh();
  redirect(`/checkout/${orderId}`);
}

export async function cancelOrder(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/account/orders");
  const { error } = await run("cancel_order", { p_order: text(form, "orderId") });
  if (error) return { error: tradeError(error) };
  refresh();
  redirect("/account/orders");
}

export async function shipOrder(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/sell/orders");
  const tracking = text(form, "tracking").trim();
  if (tracking.length < 4) return { error: "ใส่เลขพัสดุ" };
  const { error } = await run("ship_order", { p_order: text(form, "orderId"), p_tracking: tracking });
  if (error) return { error: tradeError(error) };
  refresh();
  return { error: null, message: "บันทึกเลขพัสดุแล้ว" };
}

export async function confirmReceived(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/account/orders");
  const { error } = await run("confirm_received", { p_order: text(form, "orderId") });
  if (error) return { error: tradeError(error) };
  refresh();
  return { error: null, message: "ขอบคุณ ปิดคำสั่งซื้อแล้ว" };
}

export async function makeOffer(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  const productId = text(form, "productId");
  await requireUser(text(form, "returnTo") || "/");
  const amount = bahtToSatang(text(form, "amount"));
  if (amount === null) return { error: "ใส่ราคาเป็นตัวเลข" };
  const { data, error } = await run("make_offer", { p_product: productId, p_amount: amount });
  if (error) return { error: tradeError(error) };
  refresh();
  if (data === "below_floor") return { error: "ต่ำกว่าที่ร้านรับได้ ลองเสนอใหม่ (ครั้งนี้นับเป็น 1 ใน 3 ครั้ง)" };
  return { error: null, message: "ส่งข้อเสนอแล้ว ร้านจะตอบภายใน 24 ชั่วโมง" };
}

export async function respondOffer(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/sell/offers");
  const answer = text(form, "answer");
  let counter: number | null = null;
  if (answer === "counter") {
    counter = bahtToSatang(text(form, "amount"));
    if (counter === null) return { error: "ใส่ราคาที่จะเสนอกลับเป็นตัวเลข" };
  }
  const { data, error } = await run("respond_offer", { p_offer: text(form, "offerId"), p_action: answer, p_counter: counter });
  if (error) return { error: tradeError(error) };
  refresh();
  if (answer === "accept" && data) redirect("/sell/orders");
  return { error: null, message: answer === "counter" ? "ส่งราคาเสนอกลับแล้ว" : "ไม่รับข้อเสนอนี้แล้ว" };
}

export async function answerCounter(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/account/offers");
  const answer = text(form, "answer");
  let amount: number | null = null;
  if (answer === "raise") {
    amount = bahtToSatang(text(form, "amount"));
    if (amount === null) return { error: "ใส่ราคาใหม่เป็นตัวเลข" };
  }
  const { data, error } = await run("answer_counter", { p_offer: text(form, "offerId"), p_action: answer, p_amount: amount });
  if (error) return { error: tradeError(error) };
  refresh();
  if (answer === "accept" && data) redirect(`/checkout/${data}`);
  return { error: null, message: answer === "raise" ? "ส่งราคาใหม่แล้ว" : "ปิดข้อเสนอนี้แล้ว" };
}

export async function withdrawOffer(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/account/offers");
  const { error } = await run("withdraw_offer", { p_offer: text(form, "offerId") });
  if (error) return { error: tradeError(error) };
  refresh();
  return { error: null, message: "ถอนข้อเสนอแล้ว" };
}

export async function setOfferFloor(_prev: TradeState | null, form: FormData): Promise<TradeState> {
  await requireUser("/sell/products");
  const floor = bahtToSatang(text(form, "floor"));
  if (floor === null) return { error: "ใส่ราคาเป็นตัวเลข" };
  const { error } = await run("set_offer_floor", { p_product: text(form, "productId"), p_floor: floor });
  if (error) return { error: tradeError(error) };
  return { error: null, message: "บันทึกราคาต่ำสุดแล้ว ผู้ซื้อจะไม่เห็นตัวเลขนี้" };
}

export async function markNotificationsRead(): Promise<void> {
  await requireUser("/account/notifications");
  await run("mark_notifications_read", {});
  revalidatePath("/account/notifications");
}
