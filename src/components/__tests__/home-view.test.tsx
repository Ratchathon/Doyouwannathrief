import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { HomeView } from "@/components/home-view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const styles = [
  { slug: "streetwear", name_en: "Streetwear" },
  { slug: "vintage", name_en: "Vintage" },
];
const shops = [
  { slug: "tuekdaeng", display_name: "TUEKDAENG VINTAGE", province: "กรุงเทพมหานคร", style: "Vintage" },
  { slug: "nightshift", display_name: "NIGHTSHIFT SUPPLY", province: "เชียงใหม่", style: null },
];

describe("HomeView", () => {
  it("leads with the DO YOU WANNA THRIFT? headline, not product photos", () => {
    render(<HomeView styles={styles} shops={shops} />);
    expect(screen.getByRole("heading", { level: 1, name: "DO YOU WANNA THRIFT?" })).toBeInTheDocument();
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("links each style pillar to its style page", () => {
    render(<HomeView styles={styles} shops={shops} />);
    const pillars = screen.getByRole("navigation", { name: "Shop by style" });
    expect(within(pillars).getByRole("link", { name: /STREETWEAR/ })).toHaveAttribute("href", "/styles/streetwear");
    expect(within(pillars).getByRole("link", { name: /VINTAGE/ })).toHaveAttribute("href", "/styles/vintage");
  });

  it("numbers each style and shows its Thai name for the phone tiles", () => {
    render(<HomeView styles={[{ slug: "vintage", name_en: "Vintage", name_th: "วินเทจ" }]} shops={shops} />);
    const nav = screen.getByRole("navigation", { name: "Shop by style" });
    const link = within(nav).getByRole("link", { name: /VINTAGE/ });
    expect(link).toHaveTextContent("01");
    expect(link).toHaveTextContent("วินเทจ");
  });

  it("searches with a GET form to /search using q", () => {
    render(<HomeView styles={styles} shops={shops} />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/search");
    expect(within(form).getByLabelText("ค้นหา")).toHaveAttribute("name", "q");
    expect(within(form).getByRole("button", { name: "SEARCH" })).toBeInTheDocument();
  });

  it("lists new shops with their province and style", () => {
    render(<HomeView styles={styles} shops={shops} />);
    const section = screen.getByRole("region", { name: "NEW SHOPS" });
    const link = within(section).getByRole("link", { name: /TUEKDAENG VINTAGE/ });
    expect(link).toHaveAttribute("href", "/tuekdaeng");
    expect(link).toHaveTextContent("กรุงเทพมหานคร");
    expect(link).toHaveTextContent("VINTAGE");
    expect(within(section).getByRole("link", { name: "SEE ALL" })).toHaveAttribute("href", "/discover/shops");
  });

  it("invites shops to open when there are none yet", () => {
    render(<HomeView styles={styles} shops={[]} />);
    const section = screen.getByRole("region", { name: "NEW SHOPS" });
    expect(within(section).getByText(/ยังไม่มีร้าน/)).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "OPEN YOUR SHOP" })).toHaveAttribute("href", "/sell/apply");
  });

  it("explains how buying works", () => {
    render(<HomeView styles={styles} shops={shops} />);
    expect(screen.getByRole("link", { name: "HOW IT WORKS" })).toHaveAttribute("href", "/how-it-works");
  });
});
