import { describe, expect, it } from "vitest";
import { normalizeSocialLink, validateShopApplication } from "@/lib/shops/application";
import { PROVINCES } from "@/lib/shops/provinces";

const valid = {
  displayName: "ร้านมือสองตึกแดง",
  slug: "tuekdaeng",
  province: "กรุงเทพมหานคร",
  bio: "วินเทจคัดมือ ย่านอารีย์",
  styles: ["vintage", "streetwear"],
  socialLinks: ["https://www.instagram.com/tuekdaeng"],
};

describe("PROVINCES", () => {
  it("lists all 77 provinces once each", () => {
    expect(PROVINCES).toHaveLength(77);
    expect(new Set(PROVINCES).size).toBe(77);
    expect(PROVINCES).toContain("กรุงเทพมหานคร");
    expect(PROVINCES).toContain("เชียงใหม่");
    expect(PROVINCES).toContain("บึงกาฬ");
  });
});

describe("normalizeSocialLink", () => {
  it.each([
    ["https://www.instagram.com/tuekdaeng", "https://www.instagram.com/tuekdaeng"],
    ["instagram.com/tuekdaeng", "https://instagram.com/tuekdaeng"],
    ["  https://WWW.Instagram.com/tuekdaeng/  ", "https://www.instagram.com/tuekdaeng/"],
    ["https://www.tiktok.com/@tuekdaeng", "https://www.tiktok.com/@tuekdaeng"],
    ["https://facebook.com/tuekdaeng", "https://facebook.com/tuekdaeng"],
    ["https://m.facebook.com/tuekdaeng", "https://m.facebook.com/tuekdaeng"],
    ["http://instagram.com/tuekdaeng", "https://instagram.com/tuekdaeng"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeSocialLink(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/instagram.com/x",
    "https://instagram.com.evil.example/x",
    "https://notinstagram.com/x",
    "https://instagram.com",
    "https://instagram.com/",
    "javascript:alert(1)",
    "https://user:pass@instagram.com/x",
    "ftp://instagram.com/x",
    "",
  ])("rejects %j", (input) => {
    expect(normalizeSocialLink(input)).toBeNull();
  });
});

describe("validateShopApplication", () => {
  it("accepts a complete application and normalizes it", () => {
    const result = validateShopApplication({ ...valid, slug: " TuekDaeng ", displayName: "  ร้านมือสองตึกแดง  " });
    expect(result).toEqual({
      ok: true,
      value: { ...valid, slug: "tuekdaeng", displayName: "ร้านมือสองตึกแดง" },
    });
  });

  it("drops blank social link rows the form may send", () => {
    const result = validateShopApplication({ ...valid, socialLinks: ["", "instagram.com/tuekdaeng", "  "] });
    expect(result.ok && result.value.socialLinks).toEqual(["https://instagram.com/tuekdaeng"]);
  });

  it("reports every problem at once, per field, in Thai", () => {
    const result = validateShopApplication({
      displayName: "",
      slug: "ตึกแดง",
      province: "Bangkok",
      bio: "x".repeat(501),
      styles: [],
      socialLinks: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      ["bio", "displayName", "province", "slug", "socialLinks", "styles"].sort(),
    );
    for (const message of Object.values(result.errors)) expect(message).toMatch(/[฀-๿]/);
  });

  it("allows at most 3 styles", () => {
    const result = validateShopApplication({ ...valid, styles: ["vintage", "streetwear", "y2k", "workwear"] });
    expect(!result.ok && result.errors.styles).toBeTruthy();
  });

  it("rejects duplicate styles", () => {
    const result = validateShopApplication({ ...valid, styles: ["vintage", "vintage"] });
    expect(!result.ok && result.errors.styles).toBeTruthy();
  });

  it("allows at most 3 social links and points at the bad one", () => {
    const tooMany = validateShopApplication({
      ...valid,
      socialLinks: ["instagram.com/a", "tiktok.com/@b", "facebook.com/c", "instagram.com/d"],
    });
    expect(!tooMany.ok && tooMany.errors.socialLinks).toBeTruthy();

    const bad = validateShopApplication({ ...valid, socialLinks: ["instagram.com/a", "evil.example/x"] });
    expect(!bad.ok && bad.errors.socialLinks).toMatch(/evil\.example/);
  });

  it("rejects duplicate social links", () => {
    const result = validateShopApplication({
      ...valid,
      socialLinks: ["https://instagram.com/a", "instagram.com/a"],
    });
    expect(!result.ok && result.errors.socialLinks).toBeTruthy();
  });

  it("lets the bio be empty", () => {
    expect(validateShopApplication({ ...valid, bio: "" }).ok).toBe(true);
  });
});
