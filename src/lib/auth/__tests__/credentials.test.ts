import { describe, expect, it } from "vitest";
import { authErrorMessage, validateEmail, validatePassword } from "@/lib/auth/credentials";

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
