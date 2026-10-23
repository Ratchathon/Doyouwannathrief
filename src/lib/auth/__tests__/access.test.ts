import { describe, expect, it } from "vitest";
import { requiredAccess } from "@/lib/auth/access";

describe("requiredAccess", () => {
  it.each(["/", "/discover", "/tuekdaeng", "/tuekdaeng/products/abc", "/login", "/signup", "/help", "/auth/callback"])(
    "lets anyone open %s",
    (path) => {
      expect(requiredAccess(path)).toBe("public");
    },
  );

  it.each(["/account", "/account/orders", "/sell", "/sell/products/new", "/report", "/report/new"])(
    "requires sign-in for %s",
    (path) => {
      expect(requiredAccess(path)).toBe("user");
    },
  );

  it.each(["/admin", "/admin/shops", "/admin/reports/123"])("requires an admin for %s", (path) => {
    expect(requiredAccess(path)).toBe("admin");
  });

  it("does not treat a shop whose slug merely starts with a protected word as protected", () => {
    // "accounting" is a valid shop slug and must stay public.
    expect(requiredAccess("/accounting")).toBe("public");
    expect(requiredAccess("/seller-x")).toBe("public");
    expect(requiredAccess("/administer")).toBe("public");
  });
});
