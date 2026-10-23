import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteHeader } from "@/components/site-header";

const styles = [
  { slug: "streetwear", name_en: "Streetwear" },
  { slug: "korean-japanese", name_en: "Korean / Japanese" },
];
const shops = [
  { slug: "tuekdaeng", display_name: "TUEKDAENG VINTAGE", province: "กรุงเทพมหานคร" },
  { slug: "nightshift", display_name: "NIGHTSHIFT SUPPLY", province: "เชียงใหม่" },
];

function setup() {
  const user = userEvent.setup();
  render(<SiteHeader styles={styles} shops={shops} />);
  return user;
}

describe("SiteHeader", () => {
  it("links the wordmark home", () => {
    setup();
    expect(screen.getByRole("link", { name: "DOYOUWANNATHRIFT" })).toHaveAttribute("href", "/");
  });

  it("opens the STYLES menu with a link to each style page", async () => {
    const user = setup();
    const button = screen.getByRole("button", { name: "STYLES" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("region", { name: "STYLES" });
    expect(within(menu).getByRole("link", { name: "STREETWEAR" })).toHaveAttribute("href", "/styles/streetwear");
    expect(within(menu).getByRole("link", { name: "KOREAN / JAPANESE" })).toHaveAttribute("href", "/styles/korean-japanese");
  });

  it("opens the SHOPS menu with each shop and a link to all shops", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "SHOPS" }));
    const menu = screen.getByRole("region", { name: "SHOPS" });
    expect(within(menu).getByRole("link", { name: /TUEKDAENG VINTAGE/ })).toHaveAttribute("href", "/tuekdaeng");
    expect(within(menu).getByRole("link", { name: "ALL SHOPS" })).toHaveAttribute("href", "/shops");
  });

  it("keeps only one menu open at a time", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "STYLES" }));
    await user.click(screen.getByRole("button", { name: "SHOPS" }));
    expect(screen.queryByRole("region", { name: "STYLES" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "SHOPS" })).toBeInTheDocument();
  });

  it("closes a menu with Escape and returns focus to its button", async () => {
    const user = setup();
    const button = screen.getByRole("button", { name: "STYLES" });
    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "STYLES" })).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("closes a menu when clicking elsewhere", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "STYLES" }));
    await user.click(document.body);
    expect(screen.queryByRole("region", { name: "STYLES" })).not.toBeInTheDocument();
  });

  it("has labelled search and account links", () => {
    setup();
    expect(screen.getByRole("link", { name: "ค้นหา" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: "บัญชีของฉัน" })).toHaveAttribute("href", "/account");
  });

  it("offers the same navigation in the mobile menu", async () => {
    const user = setup();
    const toggle = screen.getByRole("button", { name: "เมนู" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("dialog", { name: "เมนู" });
    expect(within(panel).getByRole("link", { name: "DISCOVER" })).toHaveAttribute("href", "/discover");
    expect(within(panel).getByRole("link", { name: "STREETWEAR" })).toHaveAttribute("href", "/styles/streetwear");
    expect(within(panel).getByRole("link", { name: /NIGHTSHIFT SUPPLY/ })).toHaveAttribute("href", "/nightshift");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "เมนู" })).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("still renders when there are no shops yet", async () => {
    const user = userEvent.setup();
    render(<SiteHeader styles={styles} shops={[]} />);
    await user.click(screen.getByRole("button", { name: "SHOPS" }));
    const menu = screen.getByRole("region", { name: "SHOPS" });
    expect(within(menu).getByText("ยังไม่มีร้าน")).toBeInTheDocument();
  });
});
