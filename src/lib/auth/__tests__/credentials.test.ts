import { describe, expect, it } from "vitest";
import { authErrorMessage, fromSupabaseError, validateEmail, validatePassword } from "@/lib/auth/credentials";

describe("validateEmail", () => {
  it("accepts and normalizes a normal address", () => {
    expect(validateEmail("  Mint@Example.com ")).toEqual({ ok: true, value: "mint@example.com" });
  });

  it.each([
    ["", "email_required"],
    ["   ", "email_required"],
    ["mint", "email_invalid"],
    ["mint@", "email_invalid"],
    ["@example.com", "email_invalid"],
    ["mint@example", "email_invalid"],
    ["mint @example.com", "email_invalid"],
    [`${"a".repeat(250)}@x.co`, "email_invalid"],
  ])("rejects %j", (input, error) => {
    expect(validateEmail(input)).toEqual({ ok: false, error });
  });
});

describe("validatePassword", () => {
  it("accepts 8 or more characters", () => {
    expect(validatePassword("abcd1234")).toEqual({ ok: true, value: "abcd1234" });
  });

  it("keeps spaces, since they are part of the password", () => {
    expect(validatePassword(" two words here ")).toEqual({ ok: true, value: " two words here " });
  });

  it.each([
    ["", "password_required"],
    ["abc123", "password_too_short"],
    ["a".repeat(73), "password_too_long"],
  ])("rejects %j", (input, error) => {
    expect(validatePassword(input)).toEqual({ ok: false, error });
  });
});

describe("authErrorMessage", () => {
  it("has a Thai message for every error, including ones from Supabase", () => {
    const errors = [
      "email_required",
      "email_invalid",
      "password_required",
      "password_too_short",
      "password_too_long",
      "invalid_credentials",
      "email_not_confirmed",
      "user_already_exists",
      "rate_limited",
      "link_expired",
      "unknown",
    ] as const;
    for (const error of errors) {
      expect(authErrorMessage(error)).toMatch(/[฀-๿]/);
    }
  });
});

describe("fromSupabaseError", () => {
  it.each([
    ["invalid_credentials", "invalid_credentials"],
    ["email_not_confirmed", "email_not_confirmed"],
    ["user_already_exists", "user_already_exists"],
    ["email_exists", "user_already_exists"],
    ["over_request_rate_limit", "rate_limited"],
    ["over_email_send_rate_limit", "rate_limited"],
    ["otp_expired", "link_expired"],
    ["flow_state_expired", "link_expired"],
    ["flow_state_not_found", "link_expired"],
    ["bad_code_verifier", "link_expired"],
    ["weak_password", "password_weak"],
    ["same_password", "password_same"],
    ["email_address_invalid", "email_invalid"],
    ["something_new_from_supabase", "unknown"],
  ])("maps %s to %s", (code, expected) => {
    expect(fromSupabaseError({ code })).toBe(expected);
  });

  it("treats a missing code as unknown", () => {
    expect(fromSupabaseError({})).toBe("unknown");
  });

  it.each(["constructor", "toString", "__proto__"])("does not read built-in object keys like %s", (code) => {
    expect(fromSupabaseError({ code })).toBe("unknown");
  });

  it("has Thai messages for the password errors only Supabase reports", () => {
    expect(authErrorMessage("password_weak")).toMatch(/[฀-๿]/);
    expect(authErrorMessage("password_same")).toMatch(/[฀-๿]/);
  });
});
