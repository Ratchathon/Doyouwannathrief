// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = { exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() };

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));

const { GET } = await import("@/app/auth/callback/route");

const call = (query: string) => GET(new NextRequest(`https://example.test/auth/callback${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
  it("finishes a Google or magic-link sign-in and continues to next", async () => {
    const res = await call("?code=abc&next=%2Fsell");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(res.headers.get("location")).toBe("https://example.test/sell");
  });

  it("confirms an email link that uses a token hash", async () => {
    const res = await call("?token_hash=xyz&type=signup&next=%2Faccount");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "xyz", type: "signup" });
    expect(res.headers.get("location")).toBe("https://example.test/account");
  });

  it("ignores token types it does not know", async () => {
    const res = await call("?token_hash=xyz&type=hack");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://example.test/login?error=link_expired");
  });

  it("never redirects off-site", async () => {
    const res = await call("?code=abc&next=https%3A%2F%2Fevil.example");
    expect(res.headers.get("location")).toBe("https://example.test/");
  });

  it("sends an expired link back to sign-in with a reason", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "flow_state_expired" } });
    const res = await call("?code=old");
    expect(res.headers.get("location")).toBe("https://example.test/login?error=link_expired");
  });

  it("passes on an error Google or Supabase reported", async () => {
    const res = await call("?error=access_denied&error_code=otp_expired");
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe("https://example.test/login?error=link_expired");
  });

  it("handles a visit with nothing to verify", async () => {
    const res = await call("");
    expect(res.headers.get("location")).toBe("https://example.test/login?error=link_expired");
  });
});
