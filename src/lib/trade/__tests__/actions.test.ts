// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: vi.fn(async () => "u1") }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

class RedirectSignal extends Error {
  constructor(public to: string) {
    super(`redirect:${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectSignal(to);
  },
}));

const { tradeError } = await import("@/lib/trade/errors");
const { buyNow, makeOffer, respondOffer, answerCounter, shipOrder } = await import("@/lib/trade/actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}
async function redirectOf(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof RedirectSignal) return e.to;
    throw e;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => rpc.mockReset());

describe("tradeError", () => {
  it.each([
    ["This item is not on sale", "ของชิ้นนี้ไม่ได้วางขายแล้ว"],
    ["A new offer must beat the current one", "ต้องเสนอสูงกว่าข้อเสนอที่มีอยู่"],
    ["You have used your 3 offers on this item", "คุณยื่นข้อเสนอชิ้นนี้ครบ 3 ครั้งแล้ว"],
    ["You have used all 3 counter rounds; accept or reject", "ต่อรองครบ 3 รอบแล้ว เหลือรับหรือไม่รับ"],
    ["something new", "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง"],
  ])("%s → %s", (message, thai) => {
    expect(tradeError({ message })).toBe(thai);
  });
});

describe("buyNow", () => {
  it("opens checkout for the new order", async () => {
    rpc.mockResolvedValue({ data: "o1", error: null });
    expect(await redirectOf(buyNow(null, form({ productId: "p1" })))).toBe("/checkout/o1");
    expect(rpc).toHaveBeenCalledWith("buy_now", { p_product: "p1" });
  });

  it("explains why the item cannot be bought", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "This item is not on sale" } });
    expect(await buyNow(null, form({ productId: "p1" }))).toEqual({ error: "ของชิ้นนี้ไม่ได้วางขายแล้ว" });
  });
});

describe("makeOffer", () => {
  it("sends the amount in satang and says the shop has 24 hours", async () => {
    rpc.mockResolvedValue({ data: "pending", error: null });
    const state = await makeOffer(null, form({ productId: "p1", amount: "1,050" }));
    expect(rpc).toHaveBeenCalledWith("make_offer", { p_product: "p1", p_amount: 105000 });
    expect(state).toEqual({ error: null, message: "ส่งข้อเสนอแล้ว ร้านจะตอบภายใน 24 ชั่วโมง" });
  });

  it("says an offer under the floor was turned away, without the floor", async () => {
    rpc.mockResolvedValue({ data: "below_floor", error: null });
    const state = await makeOffer(null, form({ productId: "p1", amount: "100" }));
    expect(state.error).toBe("ต่ำกว่าที่ร้านรับได้ ลองเสนอใหม่ (ครั้งนี้นับเป็น 1 ใน 3 ครั้ง)");
  });

  it("checks the amount before asking the database", async () => {
    const state = await makeOffer(null, form({ productId: "p1", amount: "abc" }));
    expect(state.error).toBe("ใส่ราคาเป็นตัวเลข");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("answering", () => {
  it("takes the shop to its orders after accepting", async () => {
    rpc.mockResolvedValue({ data: "o9", error: null });
    expect(await redirectOf(respondOffer(null, form({ offerId: "f1", answer: "accept" })))).toBe("/sell/orders");
    expect(rpc).toHaveBeenCalledWith("respond_offer", { p_offer: "f1", p_action: "accept", p_counter: null });
  });

  it("sends a counter in satang", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await respondOffer(null, form({ offerId: "f1", answer: "counter", amount: "450" }));
    expect(rpc).toHaveBeenCalledWith("respond_offer", { p_offer: "f1", p_action: "counter", p_counter: 45000 });
  });

  it("takes the buyer to checkout after accepting a counter", async () => {
    rpc.mockResolvedValue({ data: "o2", error: null });
    expect(await redirectOf(answerCounter(null, form({ offerId: "f1", answer: "accept" })))).toBe("/checkout/o2");
  });
});

describe("shipOrder", () => {
  it("needs a tracking number", async () => {
    expect((await shipOrder(null, form({ orderId: "o1", tracking: " " }))).error).toBe("ใส่เลขพัสดุ");
    expect(rpc).not.toHaveBeenCalled();
  });
});
