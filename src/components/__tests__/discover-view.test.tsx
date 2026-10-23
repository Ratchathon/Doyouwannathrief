import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DiscoverView, type DiscoverData } from "@/components/discover-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const item = (id: string, extra: Partial<DiscoverData["dropped"][number]> = {}) => ({
  id,
  title: `ชิ้น ${id}`,
  brand: null,
  price_satang: 45000,
  size_label: "M",
  status: "active",
  shop_slug: "nightshift",
  shop_name: "NIGHTSHIFT SUPPLY",
  photo: null,
  ...extra,
});

const data: DiscoverData = {
  trending: [{ ...item("t1"), views: 412 }],
  dropped: [item("d1"), item("d2")],
  near: [],
  cheap: [item("c1")],
  shops: [{ slug: "nightshift", display_name: "NIGHTSHIFT SUPPLY", province: "เชียงใหม่", style: null, isNew: true }],
  province: null,
};

const section = (name: string) => screen.getByRole("region", { name });

describe("DiscoverView", () => {
  it("shows the sections in the agreed order", () => {
    render(<DiscoverView data={{ ...data, province: "เชียงใหม่", near: [item("n1")] }} />);
    const names = screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"));
    expect(names).toEqual(["TRENDING", "JUST DROPPED", "NEAR YOU", "UNDER ฿500", "NEW SHOPS"]);
  });

  it("labels trending items with their view counts", () => {
    render(<DiscoverView data={data} />);
    expect(within(section("TRENDING")).getByRole("link", { name: /ชิ้น t1/ })).toHaveTextContent("412 VIEWS");
  });

  it("hides TRENDING until there are enough views", () => {
    render(<DiscoverView data={{ ...data, trending: [] }} />);
    expect(screen.queryByRole("region", { name: "TRENDING" })).not.toBeInTheDocument();
  });

  it("links SEE ALL to matching searches", () => {
    render(<DiscoverView data={{ ...data, province: "เชียงใหม่", near: [item("n1")] }} />);
    expect(within(section("JUST DROPPED")).getByRole("link", { name: "SEE ALL" })).toHaveAttribute("href", "/search");
    expect(within(section("UNDER ฿500")).getByRole("link", { name: "SEE ALL" })).toHaveAttribute("href", "/search?max=500");
    expect(within(section("NEAR YOU")).getByRole("link", { name: "SEE ALL" })).toHaveAttribute(
      "href",
      `/search?province=${encodeURIComponent("เชียงใหม่")}`,
    );
    expect(within(section("NEW SHOPS")).getByRole("link", { name: "SEE ALL" })).toHaveAttribute("href", "/shops");
  });

  it("asks for a province before showing NEAR YOU items", () => {
    render(<DiscoverView data={data} />);
    const near = section("NEAR YOU");
    expect(within(near).getByLabelText("จังหวัด")).toHaveValue("");
    expect(within(near).getByText("เลือกจังหวัดเพื่อดูของจากร้านใกล้คุณ")).toBeInTheDocument();
  });

  it("says so when a province has nothing yet", () => {
    render(<DiscoverView data={{ ...data, province: "ตราด" }} />);
    expect(within(section("NEAR YOU")).getByText(/ยังไม่มีของในจังหวัดนี้/)).toBeInTheDocument();
  });

  it("shows new shops as round badges", () => {
    render(<DiscoverView data={data} />);
    expect(within(section("NEW SHOPS")).getByRole("link", { name: /NIGHTSHIFT SUPPLY/ })).toHaveAttribute("href", "/nightshift");
  });
});
