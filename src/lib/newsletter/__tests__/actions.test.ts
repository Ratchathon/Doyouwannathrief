// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

const { subscribeNewsletter } = await import("@/lib/newsletter/actions");

const form = (email: unknown) => {
  const data = new FormData();
  if (typeof email === "string") data.set("email", email);
  return data;
};
const idle = { status: "idle" as const };

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ error: null });
});

describe("subscribeNewsletter", () => {
  it("subscribes the email and thanks the visitor", async () => {
    const result = await subscribeNewsletter(idle, form(" fan@example.com "));
    expect(rpc).toHaveBeenCalledWith("subscribe_newsletter", { p_email: "fan@example.com" });
    expect(result.status).toBe("done");
    expect(result.message).toMatch(/[฀-๿]/);
  });

  it.each(["", "nope", "a@b"])("asks for a valid email without calling the database: %j", async (email) => {
    const result = await subscribeNewsletter(idle, form(email));
    expect(result.status).toBe("error");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("handles a missing field", async () => {
    expect((await subscribeNewsletter(idle, form(undefined))).status).toBe("error");
  });

  it("reports a database failure in Thai", async () => {
    rpc.mockResolvedValue({ error: { code: "500", message: "boom" } });
    const result = await subscribeNewsletter(idle, form("fan@example.com"));
    expect(result).toEqual({ status: "error", message: expect.stringMatching(/[฀-๿]/) });
  });
});
