// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
}));

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

const {
  requestPasswordReset,
  sendMagicLink,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
} = await import("@/lib/auth/actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof RedirectSignal) return e.to;
    throw e;
  }
  throw new Error("expected a redirect");
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
  for (const fn of Object.values(auth)) fn.mockResolvedValue({ data: {}, error: null });
});

describe("signInWithPassword", () => {
  it("does not contact Supabase when the input is invalid", async () => {
    const state = await signInWithPassword(null, form({ email: "mint", password: "x" }));
    expect(state).toEqual({ error: "อีเมลไม่ถูกต้อง ตรวจดูอีกครั้ง เช่น name@gmail.com" });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in with a normalized email and goes to a safe next page", async () => {
    const to = await redirectOf(
      signInWithPassword(null, form({ email: " Mint@Example.com ", password: "abcd1234", next: "/sell" })),
    );
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "mint@example.com", password: "abcd1234" });
    expect(to).toBe("/sell");
  });

  it("ignores an unsafe next page", async () => {
    const to = await redirectOf(
      signInWithPassword(null, form({ email: "mint@example.com", password: "abcd1234", next: "//evil.example" })),
    );
    expect(to).toBe("/");
  });

  it("explains a wrong password in Thai", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code: "invalid_credentials" } });
    const state = await signInWithPassword(null, form({ email: "mint@example.com", password: "abcd1234" }));
    expect(state).toEqual({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
  });
});

describe("signUpWithPassword", () => {
  it("rejects a short password before contacting Supabase", async () => {
    const state = await signUpWithPassword(null, form({ email: "mint@example.com", password: "abc" }));
    expect(state.error).toMatch(/อย่างน้อย 8/);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("asks Supabase to send the confirmation link back to our callback", async () => {
    const state = await signUpWithPassword(null, form({ email: "mint@example.com", password: "abcd1234", next: "/sell" }));
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "mint@example.com",
      password: "abcd1234",
      options: { emailRedirectTo: "https://example.test/auth/callback?next=%2Fsell" },
    });
    expect(state).toEqual({ error: null, sent: true });
  });
});

describe("sendMagicLink", () => {
  it("sends a sign-in link that returns to the callback", async () => {
    const state = await sendMagicLink(null, form({ email: "mint@example.com" }));
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "mint@example.com",
      options: { emailRedirectTo: "https://example.test/auth/callback?next=%2F" },
    });
    expect(state).toEqual({ error: null, sent: true });
  });

  it("explains rate limits in Thai", async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: { code: "over_email_send_rate_limit" } });
    const state = await sendMagicLink(null, form({ email: "mint@example.com" }));
    expect(state).toEqual({ error: "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่" });
  });
});

describe("signInWithGoogle", () => {
  it("sends the user to Google's consent page", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://accounts.google.com/o/oauth2/x" }, error: null });
    const to = await redirectOf(signInWithGoogle(form({ next: "/account" })));
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://example.test/auth/callback?next=%2Faccount" },
    });
    expect(to).toBe("https://accounts.google.com/o/oauth2/x");
  });

  it("returns to sign-in with an error when Google is unavailable", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { code: "provider_disabled" } });
    const to = await redirectOf(signInWithGoogle(form({})));
    expect(to).toBe("/login?error=unknown");
  });
});

describe("requestPasswordReset", () => {
  it("always reports sent, so the form cannot reveal which emails have accounts", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { code: "user_not_found" } });
    const state = await requestPasswordReset(null, form({ email: "nobody@example.com" }));
    expect(state).toEqual({ error: null, sent: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("nobody@example.com", {
      redirectTo: "https://example.test/auth/callback?next=%2Fauth%2Freset-password",
    });
  });

  it("still reports rate limits, which reveal nothing about accounts", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: { code: "over_email_send_rate_limit" } });
    const state = await requestPasswordReset(null, form({ email: "mint@example.com" }));
    expect(state).toEqual({ error: "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่" });
  });
});

describe("updatePassword", () => {
  it("requires both entries to match", async () => {
    const state = await updatePassword(null, form({ password: "abcd1234", confirm: "abcd12345" }));
    expect(state.error).toMatch(/ไม่ตรงกัน/);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("saves the new password and goes to the account page", async () => {
    const to = await redirectOf(updatePassword(null, form({ password: "abcd1234", confirm: "abcd1234" })));
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "abcd1234" });
    expect(to).toBe("/account");
  });
});

describe("signOut", () => {
  it("signs out and returns home", async () => {
    const to = await redirectOf(signOut());
    expect(auth.signOut).toHaveBeenCalled();
    expect(to).toBe("/");
  });
});
