import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CONDITIONS,
  REQUIRED_MEASUREMENTS,
  missingPhotos,
  parseBaht,
  validateListing,
  type ListingInput,
} from "@/lib/products/listing";

const valid: ListingInput = {
  title: "เสื้อเชิ้ตเดนิม Levi's ยุค 90",
  brand: "Levi's",
  description: "ผ้าหนา สีซีดสวยตามธรรมชาติ",
  category: "tops",
  sizeLabel: "L",
  price: "890",
  condition: "good",
  hasFlaws: false,
  flawsNote: "",
  chest: "58",
  length: "74",
  shoulder: "50",
  waist: "",
  styles: ["vintage"],
};

describe("catalog labels", () => {
  it("has a Thai label for every category and condition the database allows", () => {
    expect(Object.keys(CATEGORIES).sort()).toEqual(
      ["accessories", "bags", "bottoms", "dresses", "headwear", "outerwear", "shoes", "tops"].sort(),
    );
    expect(Object.keys(CONDITIONS).sort()).toEqual(["fair", "good", "like_new"]);
    for (const label of [...Object.values(CATEGORIES), ...Object.values(CONDITIONS)]) {
      expect(label).toMatch(/[฀-๿]/);
    }
  });

  it("defines required measurements for every category", () => {
    expect(Object.keys(REQUIRED_MEASUREMENTS).sort()).toEqual(Object.keys(CATEGORIES).sort());
  });
});

describe("parseBaht", () => {
  it.each([
    ["890", 89000],
    ["1,290", 129000],
    [" 1290 ", 129000],
    ["1000000", 100000000],
  ])("reads %j as %i satang", (input, satang) => {
    expect(parseBaht(input)).toBe(satang);
  });

  it.each(["", "0", "-5", "890.50", "abc", "1,2,3x", "1000001", "๘๙๐"])("rejects %j", (input) => {
    expect(parseBaht(input)).toBeNull();
  });
});

describe("validateListing", () => {
  it("accepts a complete top and converts it for the database", () => {
    const result = validateListing(valid);
    expect(result).toEqual({
      ok: true,
      value: {
        title: "เสื้อเชิ้ตเดนิม Levi's ยุค 90",
        brand: "Levi's",
        description: "ผ้าหนา สีซีดสวยตามธรรมชาติ",
        category: "tops",
        sizeLabel: "L",
        priceSatang: 89000,
        condition: "good",
        hasFlaws: false,
        flawsNote: null,
        chestCm: 58,
        lengthCm: 74,
        shoulderCm: 50,
        waistCm: null,
        styles: ["vintage"],
      },
    });
  });

  it("treats an empty brand as no brand", () => {
    const result = validateListing({ ...valid, brand: "  " });
    expect(result.ok && result.value.brand).toBeNull();
  });

  it("requires the measurements for the category", () => {
    const top = validateListing({ ...valid, shoulder: "" });
    expect(!top.ok && top.errors.shoulder).toBeTruthy();

    const pants = validateListing({ ...valid, category: "bottoms", chest: "", shoulder: "", waist: "", length: "100" });
    expect(!pants.ok && pants.errors.waist).toBeTruthy();
    expect(!pants.ok && pants.errors.chest).toBeUndefined();
  });

  it("needs no measurements for shoes", () => {
    const result = validateListing({ ...valid, category: "shoes", sizeLabel: "US 9", chest: "", length: "", shoulder: "" });
    expect(result.ok).toBe(true);
  });

  it("accepts one decimal place in measurements and rejects nonsense", () => {
    expect(validateListing({ ...valid, chest: "58.5" }).ok).toBe(true);
    for (const chest of ["0", "-3", "abc", "58.25", "400"]) {
      const result = validateListing({ ...valid, chest });
      expect(!result.ok && result.errors.chest, chest).toBeTruthy();
    }
  });

  it("requires a note describing the flaws when there are flaws", () => {
    const result = validateListing({ ...valid, hasFlaws: true, flawsNote: "" });
    expect(!result.ok && result.errors.flawsNote).toBeTruthy();
    const ok = validateListing({ ...valid, hasFlaws: true, flawsNote: "รอยด่างเล็กที่ปลายแขนซ้าย" });
    expect(ok.ok && ok.value.flawsNote).toBe("รอยด่างเล็กที่ปลายแขนซ้าย");
  });

  it("drops a flaws note when there are no flaws", () => {
    const result = validateListing({ ...valid, hasFlaws: false, flawsNote: "leftover text" });
    expect(result.ok && result.value.flawsNote).toBeNull();
  });

  it("requires 1 to 3 different styles", () => {
    for (const styles of [[], ["a", "b", "c", "d"], ["vintage", "vintage"]]) {
      const result = validateListing({ ...valid, styles });
      expect(!result.ok && result.errors.styles, styles.join()).toBeTruthy();
    }
  });

  it("reports every problem at once in Thai", () => {
    const result = validateListing({
      ...valid,
      title: "",
      category: "spaceships",
      sizeLabel: "",
      price: "free",
      condition: "destroyed",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(["title", "category", "sizeLabel", "price", "condition"]));
    for (const message of Object.values(result.errors)) expect(message).toMatch(/[฀-๿]/);
  });
});

describe("missingPhotos", () => {
  it("lists the required photos that are not uploaded yet", () => {
    expect(missingPhotos(["front"], false)).toEqual(["back", "label"]);
  });

  it("needs nothing more once front, back and label are there", () => {
    expect(missingPhotos(["front", "back", "label", "extra"], false)).toEqual([]);
  });

  it("needs a flaw photo when the item has flaws", () => {
    expect(missingPhotos(["front", "back", "label"], true)).toEqual(["flaw"]);
    expect(missingPhotos(["front", "back", "label", "flaw"], true)).toEqual([]);
  });
});
