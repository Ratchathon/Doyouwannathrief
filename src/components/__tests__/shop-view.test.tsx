import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ShopView } from "@/components/shop-view";
import type { ShopPage } from "@/lib/catalog/shop";

const page: ShopPage = {
  shop: {
    slug: "tuekdaeng",
    name: "TUEKDAENG VINTAGE",
    province: "กรุงเทพมหานคร",
    bio: "ของวินเทจยุค 90",
    social: [{ url: "https://www.instagram.com/tk", platform: "Instagram" }],
    styles: [{ slug: "vintage", en: "VINTAGE" }],
  },
  items: [
    {
      id: "i1",
      title: "เสื้อทัวร์",
      brand: null,
      price_satang: 189000,
      size_label: "L",
      status: "active",
      shop_slug: "tuekdaeng",
      shop_name: "TUEKDAENG VINTAGE",
      photo: "/samples/tuekdaeng/1-front.webp",
    },
  ],
  categories: [
    { value: "tees", en: "TEES", n: 3 },
    { value: "denim", en: "DENIM", n: 2 },
  ],
  forSale: 5,
  sold: 12,
};

describe("ShopView", () => {
  it("shows the shop name, province, bio and styles", () => {
    render(<ShopView page={page} category={null} sort="newest" params="" />);
    expect(screen.getByRole("heading", { level: 1, name: "TUEKDAENG VINTAGE" })).toBeInTheDocument();
    expect(screen.getByText("ของวินเทจยุค 90")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "VINTAGE" })).toHaveAttribute("href", "/styles/vintage");
  });

  it("shows how many items are for sale and sold", () => {
    render(<ShopView page={page} category={null} sort="newest" params="" />);
    expect(screen.getByText("FOR SALE").previousSibling).toHaveTextContent("5");
    expect(screen.getByText("SOLD").previousSibling).toHaveTextContent("12");
  });

  it("links to the shop's social accounts in a new tab", () => {
    render(<ShopView page={page} category={null} sort="newest" params="" />);
    const ig = screen.getByRole("link", { name: "Instagram ของร้าน" });
    expect(ig).toHaveAttribute("href", "https://www.instagram.com/tk");
    expect(ig).toHaveAttribute("target", "_blank");
  });

  it("filters by category with links that keep the sort", () => {
    render(<ShopView page={page} category="denim" sort="price_asc" params="category=denim&sort=price_asc" />);
    const filters = screen.getByRole("navigation", { name: "หมวดสินค้าในร้าน" });
    expect(within(filters).getByRole("link", { name: "ALL · 5" })).toHaveAttribute("href", "/tuekdaeng?sort=price_asc");
    const denim = within(filters).getByRole("link", { name: "DENIM · 2" });
    expect(denim).toHaveAttribute("aria-current", "page");
    expect(within(filters).getByRole("link", { name: "TEES · 3" })).toHaveAttribute(
      "href",
      "/tuekdaeng?sort=price_asc&category=tees",
    );
  });

  it("lists items linking to their pages", () => {
    render(<ShopView page={page} category={null} sort="newest" params="" />);
    expect(screen.getByRole("link", { name: /เสื้อทัวร์/ })).toHaveAttribute("href", "/tuekdaeng/i1");
  });

  it("says so when a category has nothing", () => {
    render(<ShopView page={{ ...page, items: [] }} category="tees" sort="newest" params="category=tees" />);
    expect(screen.getByText(/ยังไม่มีของในหมวดนี้/)).toBeInTheDocument();
  });

  it("links to reporting the shop", () => {
    render(<ShopView page={page} category={null} sort="newest" params="" />);
    expect(screen.getByRole("link", { name: "แจ้งปัญหาร้านนี้" })).toHaveAttribute("href", "/report?shop=tuekdaeng");
  });
});
