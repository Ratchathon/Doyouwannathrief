// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

let claims: { sub: string } | null = null;
let role: string | null = null;
const profileQuery = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: claims ? { claims } : null, error: null }) },
    from: (table: string) => {
      profileQuery(table);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: role ? { role } : null, error: null }) }),
        }),
      };
    },
  }),
}));

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

const { requireAdmin, requireUser } = await import("@/lib/auth/guards");

async function outcome(promise: Promise<unknown>) {
  try {
    return { ok: await promise };
  } catch (e) {
    if (e instanceof Signal) return { kind: e.kind, to: e.to };
    throw e;
  }
}

beforeEach(() => {
  claims = null;
  role = null;
  profileQuery.mockClear();
});

describe("requireUser", () => {
  it("returns the user id when signed in", async () => {
    claims = { sub: "user-1" };
    expect(await outcome(requireUser("/account"))).toEqual({ ok: "user-1" });
  });

  it("sends signed-out visitors to sign-in, coming back afterwards", async () => {
    expect(await outcome(requireUser("/sell/products"))).toEqual({
      kind: "redirect",
      to: "/login?next=%2Fsell%2Fproducts",
    });
  });
});

describe("requireAdmin", () => {
  it("lets an admin through", async () => {
    claims = { sub: "admin-1" };
    role = "admin";
    expect(await outcome(requireAdmin())).toEqual({ ok: "admin-1" });
    expect(profileQuery).toHaveBeenCalledWith("profiles");
  });

  it("shows a signed-in non-admin a plain not-found page", async () => {
    claims = { sub: "user-1" };
    role = "buyer";
    expect(await outcome(requireAdmin())).toEqual({ kind: "notFound", to: undefined });
  });

  it("shows not-found to signed-out visitors too, without revealing an admin area exists", async () => {
    expect(await outcome(requireAdmin())).toEqual({ kind: "notFound", to: undefined });
  });
});
