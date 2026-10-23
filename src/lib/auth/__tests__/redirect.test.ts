import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it.each(["/account", "/sell/products?tab=drafts", "/tuekdaeng#about", "/"])("keeps the in-site path %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["absolute URL", "https://evil.example/login"],
    ["protocol-relative URL", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["encoded backslash", "/%5Cevil.example"],
    ["encoded double slash", "/%2F%2Fevil.example"],
    ["javascript scheme", "javascript:alert(1)"],
    ["relative path without slash", "account"],
    ["newline injection", "/account\nSet-Cookie: x=1"],
    ["tab trick", "/\t/evil.example"],
  ])("falls back to home for %s", (_label, input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  it("uses the given fallback", () => {
    expect(safeNextPath("https://evil.example", "/account")).toBe("/account");
  });
});
