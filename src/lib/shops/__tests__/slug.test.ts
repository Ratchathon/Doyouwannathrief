import { describe, expect, it } from "vitest";
import { RESERVED_SLUGS, slugErrorMessage, validateSlug } from "@/lib/shops/slug";

describe("validateSlug", () => {
  it.each(["tuekdaeng", "tuek-daeng", "shop99", "abc", "a".repeat(30)])("accepts %s", (input) => {
    expect(validateSlug(input)).toEqual({ ok: true, slug: input });
  });

  it("lowercases and trims what the shop typed", () => {
    expect(validateSlug("  TuekDaeng ")).toEqual({ ok: true, slug: "tuekdaeng" });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["ab", "too_short"],
    ["a".repeat(31), "too_long"],
    ["ตึกแดง", "invalid_chars"],
    ["tuek daeng", "invalid_chars"],
    ["tuek_daeng", "invalid_chars"],
    ["tuek.daeng", "invalid_chars"],
    ["-tuek", "bad_hyphen"],
    ["tuek-", "bad_hyphen"],
    ["tuek--daeng", "bad_hyphen"],
    ["admin", "reserved"],
    ["Discover", "reserved"],
  ])("rejects %j as %s", (input, error) => {
    expect(validateSlug(input)).toEqual({ ok: false, error });
  });

  it("checks length before characters so Thai input gets the clearest message", () => {
    expect(validateSlug("ตึ")).toEqual({ ok: false, error: "too_short" });
  });
});

describe("RESERVED_SLUGS", () => {
  it("covers every top-level page the site uses", () => {
    for (const route of ["admin", "api", "login", "signup", "discover", "search", "help", "report", "account", "sell"]) {
      expect(RESERVED_SLUGS).toContain(route);
    }
  });

  it("only lists slugs a shop could otherwise register", () => {
    for (const slug of RESERVED_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slug.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("slugErrorMessage", () => {
  it("explains every error in Thai", () => {
    for (const error of ["empty", "too_short", "too_long", "invalid_chars", "bad_hyphen", "reserved"] as const) {
      expect(slugErrorMessage(error)).toMatch(/[฀-๿]/);
    }
  });
});
