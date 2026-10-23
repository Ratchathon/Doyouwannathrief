import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ResultsView, type ResultsViewProps } from "@/components/results-view";

const base: ResultsViewProps = {
  title: "RESULTS FOR “POLO”",
  description: "รวม Ralph Lauren และเสื้อโปโลทุกแบรนด์",
  path: "/search",
  params: "q=polo",
  sort: "newest",
  shops: [
    { slug: "second-season", display_name: "SECOND SEASON", province: "ภูเก็ต", style: "DESIGNER", match_count: 3 },
    { slug: "nightshift", display_name: "NIGHTSHIFT SUPPLY", province: "เชียงใหม่", style: null, match_count: 0 },
  ],
  items: [
    {
      id: "i1",
      title: "โปโลปักม้า สีกรมท่า",
      brand: "Ralph Lauren",
      price_satang: 89000,
      size_label: "L",
      status: "active",
      shop_slug: "second-season",
      shop_name: "SECOND SEASON",
      photo: "https://x/storage/v1/object/public/product-photos/i1/front.webp",
    },
    {
      id: "i2",
      title: "โปโลจระเข้",
      brand: null,
      price_satang: 119000,
      size_label: "M",
      status: "reserved",
      shop_slug: "second-season",
      shop_name: "SECOND SEASON",
      photo: null,
    },
  ],
  prevHref: null,
  nextHref: null,
};

describe("ResultsView", () => {
  it("shows the heading and description", () => {
    render(<ResultsView {...base} />);
    expect(screen.getByRole("heading", { level: 1, name: "RESULTS FOR “POLO”" })).toBeInTheDocument();
    expect(screen.getByText(base.description!)).toBeInTheDocument();
  });

  it("lists related shops with how many matching items each has", () => {
    render(<ResultsView {...base} />);
    const pane = screen.getByRole("region", { name: "SHOPS" });
    const link = within(pane).getByRole("link", { name: /SECOND SEASON/ });
    expect(link).toHaveAttribute("href", "/second-season");
    expect(link).toHaveTextContent("3 ชิ้น");
    expect(link).toHaveTextContent("DESIGNER");
    expect(within(pane).getByRole("link", { name: /NIGHTSHIFT SUPPLY/ })).not.toHaveTextContent("ชิ้น");
  });

  it("lists items linking to their page, with price, size, brand and shop", () => {
    render(<ResultsView {...base} />);
    const pane = screen.getByRole("region", { name: "ITEMS" });
    const link = within(pane).getByRole("link", { name: /โปโลปักม้า/ });
    expect(link).toHaveAttribute("href", "/second-season/i1");
    for (const text of ["฿890", "SIZE L", "RALPH LAUREN", "SECOND SEASON"]) expect(link).toHaveTextContent(text);
    expect(within(link).getByRole("img", { name: "โปโลปักม้า สีกรมท่า" })).toHaveAttribute("src", base.items[0].photo);
  });

  it("marks reserved items and copes with a missing photo", () => {
    render(<ResultsView {...base} />);
    const link = screen.getByRole("link", { name: /โปโลจระเข้/ });
    expect(link).toHaveTextContent("RESERVED");
    expect(within(link).queryByRole("img")).not.toBeInTheDocument();
  });

  it("sorts with a GET form that keeps the other filters but restarts at page 1", () => {
    render(<ResultsView {...base} params="q=polo&category=tees&page=3" />);
    const select = screen.getByLabelText("เรียงตาม");
    expect(select).toHaveValue("newest");
    const form = select.closest("form")!;
    expect(form).toHaveAttribute("action", "/search");
    const hidden = Object.fromEntries(
      [...form.querySelectorAll<HTMLInputElement>("input[type=hidden]")].map((i) => [i.name, i.value]),
    );
    expect(hidden).toEqual({ q: "polo", category: "tees" });
  });

  it("links to the previous and next pages when there are more", () => {
    render(<ResultsView {...base} prevHref="/search?q=polo" nextHref="/search?q=polo&page=3" />);
    expect(screen.getByRole("link", { name: "PREVIOUS" })).toHaveAttribute("href", "/search?q=polo");
    expect(screen.getByRole("link", { name: "NEXT" })).toHaveAttribute("href", "/search?q=polo&page=3");
  });

  it("explains when nothing matches and points to Discover", () => {
    render(<ResultsView {...base} items={[]} shops={[]} />);
    expect(within(screen.getByRole("region", { name: "ITEMS" })).getByText(/ยังไม่มีของที่ตรง/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "DISCOVER" , hidden: false })).toHaveAttribute("href", "/discover");
    expect(within(screen.getByRole("region", { name: "SHOPS" })).getByText(/ไม่มีร้านที่ตรง/)).toBeInTheDocument();
  });
});
