import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HomeView } from "@/components/home-view";
import type { CoverLine, StyleStat } from "@/lib/catalog/cover-lines";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const stat = (slug: string, name_en: string, name_th: string, pieces: number): StyleStat => ({
  slug, name_en, name_th, pieces, shops: 1, new_pieces: 0, top_shop_name: "X", top_shop_province: "Y",
});
const styles = [stat("streetwear", "Streetwear", "สตรีทแวร์", 6), stat("y2k", "Y2K", "Y2K", 0)];
const lines: CoverLine[] = [
  { key: "lead", tone: "lead", title: "VINTAGE", sub: "ใหม่ 3 ชิ้นสัปดาห์นี้ จาก TUEKDAENG VINTAGE · กรุงเทพมหานคร", href: "/styles/vintage" },
  { key: "cheap", tone: "marker", title: "UNDER ฿500", sub: "10 ชิ้นในงบห้าร้อย", href: "/search?max=500" },
];
const shops = [
  { slug: "tuekdaeng", display_name: "TUEKDAENG VINTAGE", province: "กรุงเทพมหานคร", style: "Vintage", isNew: true },
  { slug: "nightshift", display_name: "NIGHTSHIFT SUPPLY", province: "เชียงใหม่", style: null },
];

const view = (props: Partial<Parameters<typeof HomeView>[0]> = {}) =>
  render(<HomeView styles={styles} lines={lines} shops={shops} {...props} />);

describe("HomeView", () => {
  it("leads with the masthead, not product photos", () => {
    view();
    expect(screen.getByRole("heading", { level: 1, name: "DOYOUWANNATHRIFT" })).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("searches with a GET form to /search using q", () => {
    view();
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/search");
    expect(within(form).getByLabelText("ค้นหา")).toHaveAttribute("name", "q");
    expect(within(form).getByRole("button", { name: "SEARCH" })).toBeInTheDocument();
  });

  it("turns each cover line into a link", () => {
    view();
    const cover = screen.getByRole("navigation", { name: "Cover lines" });
    const lead = within(cover).getByRole("link", { name: /VINTAGE/ });
    expect(lead).toHaveAttribute("href", "/styles/vintage");
    expect(lead).toHaveTextContent("ใหม่ 3 ชิ้นสัปดาห์นี้");
    expect(within(cover).getByRole("link", { name: /UNDER ฿500/ })).toHaveAttribute("href", "/search?max=500");
  });

  it("says shops are on their way when nothing is on sale yet", () => {
    view({ lines: [] });
    const cover = screen.getByRole("navigation", { name: "Cover lines" });
    expect(within(cover).getByText("ยังไม่มีของลงขาย ร้านแรกกำลังมา")).toBeInTheDocument();
  });

  it("lists every style on the contents page with how many pieces it has", () => {
    view();
    const contents = screen.getByRole("navigation", { name: "Shop by style" });
    const street = within(contents).getByRole("link", { name: /STREETWEAR/ });
    expect(street).toHaveAttribute("href", "/styles/streetwear");
    expect(street).toHaveTextContent("06");
    expect(street).toHaveTextContent("สตรีทแวร์");
    const y2k = within(contents).getByRole("link", { name: /Y2K/ });
    expect(y2k).toHaveTextContent("00");
    expect(y2k.textContent).not.toMatch(/Y2K.*Y2K/);
  });

  it("lists new shops with their province and marks the new ones", () => {
    view();
    const section = screen.getByRole("region", { name: "NEW SHOPS" });
    const link = within(section).getByRole("link", { name: /TUEKDAENG VINTAGE/ });
    expect(link).toHaveAttribute("href", "/tuekdaeng");
    expect(link).toHaveTextContent("กรุงเทพมหานคร");
    expect(link).toHaveTextContent("NEW");
    expect(within(section).getByRole("link", { name: "SEE ALL" })).toHaveAttribute("href", "/shops");
  });

  it("invites shops to open when there are none yet", () => {
    view({ shops: [] });
    const section = screen.getByRole("region", { name: "NEW SHOPS" });
    expect(within(section).getByText(/ยังไม่มีร้าน/)).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "OPEN YOUR SHOP" })).toHaveAttribute("href", "/sell/apply");
  });

  it("explains how buying works", () => {
    view();
    expect(screen.getByRole("link", { name: "HOW IT WORKS" })).toHaveAttribute("href", "/how-it-works");
  });
});
