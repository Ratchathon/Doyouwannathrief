// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const jar = new Map<string, string>();
const setCalls: unknown[][] = [];

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (...args: unknown[]) => {
      setCalls.push(args);
      const [name, value] = args as [string, string];
      jar.set(name, value);
    },
  }),
}));

const { POST } = await import("@/app/api/views/route");

const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ID = "2f1c3b2a-0000-4000-8000-000000000001";

function request(body: unknown, ua = PHONE) {
  return new Request("http://localhost/api/views", {
    method: "POST",
    headers: { "user-agent": ua, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
  jar.clear();
  setCalls.length = 0;
});

describe("POST /api/views", () => {
  it("records a view under a hashed cookie id and sets the cookie the first time", async () => {
    const res = await POST(request({ productId: ID }));
    expect(res.status).toBe(204);
    expect(setCalls).toHaveLength(1);
    const [name, value, options] = setCalls[0] as [string, string, Record<string, unknown>];
    expect(name).toBe("dywt_vid");
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true });
    expect(rpc).toHaveBeenCalledWith("record_product_view", { p_product_id: ID, p_viewer: expect.stringMatching(/^[0-9a-f]{64}$/) });
    expect(rpc.mock.calls[0][1].p_viewer).not.toContain(value);
  });

  it("reuses the visitor's cookie", async () => {
    jar.set("dywt_vid", "11111111-1111-4111-8111-111111111111");
    await POST(request({ productId: ID }));
    expect(setCalls).toHaveLength(0);
  });

  it("does not count bots", async () => {
    const res = await POST(request({ productId: ID }, "Googlebot/2.1"));
    expect(res.status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a bad body without touching the database", async () => {
    for (const body of ["not json", { productId: "nope" }, {}]) {
      const res = await POST(request(body));
      expect(res.status).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });
});
