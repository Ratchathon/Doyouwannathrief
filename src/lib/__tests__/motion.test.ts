import { describe, expect, it } from "vitest";
import { morphClaimer, photoMorphName } from "@/lib/motion";

describe("photoMorphName", () => {
  it("names an item's photo the same on the card and on the item page", () => {
    expect(photoMorphName("9ea4073e-f703")).toBe("photo-9ea4073e-f703");
  });
});

describe("morphClaimer", () => {
  it("lets only the first card of an item morph, since names must be unique on a page", () => {
    const claim = morphClaimer();
    expect(claim("a")).toBe(true);
    expect(claim("b")).toBe(true);
    expect(claim("a")).toBe(false);
  });
});
