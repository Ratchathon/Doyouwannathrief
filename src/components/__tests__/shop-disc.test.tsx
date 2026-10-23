import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ShopDiscRow, monogram } from "@/components/shop-disc";

describe("monogram", () => {
  it.each([
    ["TUEKDAENG VINTAGE", "TV"],
    ["HARDWEAR CO.", "HC"],
    ["SEOUL TOKYO CLOSET", "ST"],
    ["NIGHTSHIFT", "NI"],
    ["ร้านมือสองตึกแดง", "ร"],
    ["  ", "?"],
  ])("%s → %s", (name, mono) => {
    expect(monogram(name)).toBe(mono);
  });
});

describe("ShopDiscRow", () => {
  const shops = [
    { slug: "tuekdaeng", display_name: "TUEKDAENG VINTAGE", province: "กรุงเทพมหานคร", isNew: true },
    { slug: "hardwear", display_name: "HARDWEAR CO.", province: "นครราชสีมา", isNew: false },
  ];

  it("links each shop by name, with its province, in a scrollable list", () => {
    render(<ShopDiscRow shops={shops} />);
    const list = screen.getByRole("list");
    const link = within(list).getByRole("link", { name: /TUEKDAENG VINTAGE/ });
    expect(link).toHaveAttribute("href", "/tuekdaeng");
    expect(link).toHaveTextContent("กรุงเทพมหานคร");
  });

  it("marks recently opened shops as NEW", () => {
    render(<ShopDiscRow shops={shops} />);
    expect(screen.getByRole("link", { name: /TUEKDAENG/ })).toHaveTextContent("NEW");
    expect(screen.getByRole("link", { name: /HARDWEAR/ })).not.toHaveTextContent("NEW");
  });

  it("can lay the shops out as a wrapping grid", () => {
    render(<ShopDiscRow shops={shops} layout="grid" />);
    expect(screen.getByRole("list").className).toMatch(/grid/);
  });
});
