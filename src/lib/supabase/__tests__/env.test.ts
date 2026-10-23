import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseEnv } from "@/lib/supabase/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("supabaseEnv", () => {
  it("reads the project URL and publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(supabaseEnv()).toEqual({ url: "https://abc.supabase.co", publishableKey: "sb_publishable_x" });
  });

  it("explains which setting is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
    expect(() => supabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("refuses a secret key in the browser-facing setting", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_secret_oops");
    expect(() => supabaseEnv()).toThrow(/secret/i);
  });
});
