// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const revalidatePath = vi.fn();
let userId: string | null = "user-1";
let isAdmin = false;

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

class Signal extends Error {
  constructor(public kind: string, public to?: string) {
    super(kind);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Signal("redirect", to);
  },
  notFound: () => {
    throw new Signal("notFound");
  },
}));
vi.mock("@/lib/auth/guards", () => ({
  requireUser: async (returnTo: string) => {
    if (!userId) throw new Signal("redirect", `/login?next=${encodeURIComponent(returnTo)}`);
    return userId;
  },
  requireAdmin: async () => {
    if (!isAdmin) throw new Signal("notFound");
    return "admin-1";
  },
}));

const { applyForShop, resubmitShop, reviewShop } = await import("@/lib/shops/actions");

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    for (const item of Array.isArray(v) ? v : [v]) data.append(k, item);
  }
  return data;
}

const validForm = {
  displayName: "ร้านมือสองตึกแดง",
  slug: "TuekDaeng",
  province: "กรุงเทพมหานคร",
  bio: "วินเทจคัดมือ",
  styles: ["vintage", "streetwear"],
  socialLinks: ["instagram.com/tuekdaeng", ""],
};

async function outcome(promise: Promise<unknown>) {
  try {
    return { value: await promise };
  } catch (e) {
    if (e instanceof Signal) return { kind: e.kind, to: e.to };
    throw e;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  userId = "user-1";
  isAdmin = false;
  rpc.mockResolvedValue({ data: "shop-1", error: null });
});

describe("applyForShop", () => {
  it("sends signed-out visitors to sign-in first", async () => {
    userId = null;
    expect(await outcome(applyForShop(null, form(validForm)))).toEqual({
      kind: "redirect",
      to: "/login?next=%2Fsell%2Fapply",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns field errors without touching the database", async () => {
    const state = await applyForShop(null, form({ ...validForm, socialLinks: [""], styles: [] }));
    expect(state.fieldErrors?.socialLinks).toBeTruthy();
    expect(state.fieldErrors?.styles).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps what the shop typed so the form can show it again", async () => {
    const state = await applyForShop(null, form({ ...validForm, styles: [] }));
    expect(state.values?.displayName).toBe("ร้านมือสองตึกแดง");
  });

  it("submits the cleaned application and goes to the waiting page", async () => {
    expect(await outcome(applyForShop(null, form(validForm)))).toEqual({ kind: "redirect", to: "/sell" });
    expect(rpc).toHaveBeenCalledWith("apply_for_shop", {
      p_slug: "tuekdaeng",
      p_display_name: "ร้านมือสองตึกแดง",
      p_province: "กรุงเทพมหานคร",
      p_bio: "วินเทจคัดมือ",
      p_social_links: ["https://instagram.com/tuekdaeng"],
      p_style_slugs: ["vintage", "streetwear"],
    });
  });

  it("explains a slug another shop already has", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "23505", message: 'violates unique constraint "shops_slug_key"' } });
    const state = await applyForShop(null, form(validForm));
    expect(state.fieldErrors?.slug).toMatch(/มีร้านใช้/);
  });

  it("explains that an account can only have one shop", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: 'violates unique constraint "shops_owner_id_key"' },
    });
    const state = await applyForShop(null, form(validForm));
    expect(state.error).toMatch(/มีร้านอยู่แล้ว/);
  });

  it("falls back to a general message for anything else", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "boom" } });
    const state = await applyForShop(null, form(validForm));
    expect(state.error).toMatch(/[฀-๿]/);
  });
});

describe("resubmitShop", () => {
  it("resubmits and refreshes the seller page", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const state = await resubmitShop(null, form({ shopId: "shop-1" }));
    expect(rpc).toHaveBeenCalledWith("resubmit_shop", { p_shop_id: "shop-1" });
    expect(revalidatePath).toHaveBeenCalledWith("/sell");
    expect(state).toEqual({ error: null });
  });

  it("passes on the date the shop may resubmit", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "23514", message: "You can resubmit on 2026-11-07" } });
    const state = await resubmitShop(null, form({ shopId: "shop-1" }));
    expect(state.error).toMatch(/2026-11-07/);
  });
});

describe("reviewShop", () => {
  it("is invisible to non-admins", async () => {
    expect(await outcome(reviewShop(null, form({ shopId: "shop-1", decision: "approve" })))).toEqual({
      kind: "notFound",
      to: undefined,
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("approves", async () => {
    isAdmin = true;
    rpc.mockResolvedValue({ data: null, error: null });
    const state = await reviewShop(null, form({ shopId: "shop-1", decision: "approve" }));
    expect(rpc).toHaveBeenCalledWith("admin_review_shop", { p_shop_id: "shop-1", p_approve: true, p_reason: null });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/shops");
    expect(state).toEqual({ error: null });
  });

  it("requires a reason before rejecting", async () => {
    isAdmin = true;
    const state = await reviewShop(null, form({ shopId: "shop-1", decision: "reject", reason: "  " }));
    expect(state.error).toMatch(/เหตุผล/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects with a reason", async () => {
    isAdmin = true;
    rpc.mockResolvedValue({ data: null, error: null });
    await reviewShop(null, form({ shopId: "shop-1", decision: "reject", reason: " ไม่ตรงแนว " }));
    expect(rpc).toHaveBeenCalledWith("admin_review_shop", {
      p_shop_id: "shop-1",
      p_approve: false,
      p_reason: "ไม่ตรงแนว",
    });
  });

  it("ignores unknown decisions", async () => {
    isAdmin = true;
    const state = await reviewShop(null, form({ shopId: "shop-1", decision: "maybe" }));
    expect(state.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});
