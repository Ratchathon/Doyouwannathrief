/** Turns the offer and order functions' English errors into Thai for the page. */
const MESSAGES: [RegExp, string][] = [
  [/not on sale/, "ของชิ้นนี้ไม่ได้วางขายแล้ว"],
  [/your own item/, "ซื้อหรือยื่นข้อเสนอของร้านตัวเองไม่ได้"],
  [/must be below the price/, "ข้อเสนอต้องต่ำกว่าราคาขาย ถ้าจะจ่ายเต็มกด BUY NOW"],
  [/must beat/, "ต้องเสนอสูงกว่าข้อเสนอที่มีอยู่"],
  [/3 offers/, "คุณยื่นข้อเสนอชิ้นนี้ครบ 3 ครั้งแล้ว"],
  [/3 counter rounds/, "ต่อรองครบ 3 รอบแล้ว เหลือรับหรือไม่รับ"],
  [/counter must be above/, "ราคาที่เสนอกลับต้องสูงกว่าข้อเสนอ และไม่เกินราคาขาย"],
  [/raise must be above/, "ราคาใหม่ต้องสูงกว่าที่เคยเสนอ และต่ำกว่าราคาที่ร้านเสนอกลับ"],
  [/no longer waiting|no counter waiting|no open offer/, "รายการนี้เปลี่ยนสถานะไปแล้ว รีเฟรชหน้าดูอีกครั้ง"],
  [/not your/, "ไม่พบรายการนี้ในบัญชีของคุณ"],
  [/at least 75%/, "ราคาต่ำสุดต้องไม่ต่ำกว่า 75% ของราคาขาย และไม่เกินราคาขาย"],
  [/Only a paid order/, "ส่งของได้หลังผู้ซื้อจ่ายเงินแล้ว"],
  [/Only a shipped order/, "ยืนยันได้หลังร้านส่งของแล้ว"],
  [/Only an unpaid order/, "ยกเลิกได้เฉพาะคำสั่งซื้อที่ยังไม่จ่าย"],
  [/Sign in/, "เข้าสู่ระบบก่อน"],
];

export function tradeError(error: { message?: string }): string {
  const message = error.message ?? "";
  return MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง";
}

/** "1,050" → 105000 satang; null when it is not a whole positive number of baht. */
export function bahtToSatang(input: string): number | null {
  const clean = input.replace(/[,\s฿]/g, "");
  if (!/^\d{1,7}$/.test(clean)) return null;
  const baht = Number(clean);
  return baht > 0 ? baht * 100 : null;
}
