import { describe, expect, it } from "vitest";
import { gate } from "@/lib/auth/gate";

describe("gate", () => {
  it("lets anyone through to public pages", () => {
    expect(gate({ pathname: "/discover", search: "", signedIn: false })).toEqual({ type: "continue" });
  });

  it("sends a signed-out visitor to sign-in and remembers where they were going", () => {
    expect(gate({ pathname: "/sell/products", search: "?tab=drafts", signedIn: false })).toEqual({
      type: "redirect",
      to: "/login?next=%2Fsell%2Fproducts%3Ftab%3Ddrafts",
    });
  });

  it("lets a signed-in user into member pages", () => {
    expect(gate({ pathname: "/account", search: "", signedIn: true })).toEqual({ type: "continue" });
  });

  it("lets a signed-in user reach the admin area, where the page itself checks the admin role", () => {
    // The proxy cannot cheaply read the role; the admin layout enforces it.
    expect(gate({ pathname: "/admin", search: "", signedIn: true })).toEqual({ type: "continue" });
  });

  it("lets a signed-out visitor reach admin URLs, where the page answers not-found", () => {
    // Redirecting to sign-in would confirm that an admin area exists.
    expect(gate({ pathname: "/admin/shops", search: "", signedIn: false })).toEqual({ type: "continue" });
  });

  it.each(["/login", "/signup"])("moves a signed-in user off %s to where they were going", (pathname) => {
    expect(gate({ pathname, search: "?next=%2Faccount", signedIn: true })).toEqual({ type: "redirect", to: "/account" });
  });

  it("never follows an unsafe next on the sign-in page", () => {
    expect(gate({ pathname: "/login", search: "?next=https%3A%2F%2Fevil.example", signedIn: true })).toEqual({
      type: "redirect",
      to: "/",
    });
  });
});
