import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "@/components/filter-bar";

function setup(params = "q=jeans", scope: "search" | "style" | "category" = "search", sizes = ["32", "30", "M"]) {
  const user = userEvent.setup();
  render(<FilterBar path="/search" params={params} scope={scope} sizes={sizes} />);
  return user;
}

describe("FilterBar", () => {
  it("offers category, size, price and province filters", () => {
    setup();
    const bar = screen.getByRole("group", { name: "ตัวกรอง" });
    for (const name of [/CATEGORY/, /SIZE/, /PRICE/, /PROVINCE/]) {
      expect(within(bar).getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("has no category filter on a category page", () => {
    setup("", "category");
    expect(within(screen.getByRole("group", { name: "ตัวกรอง" })).queryByRole("button", { name: /CATEGORY/ })).toBeNull();
  });

  it("lists the sizes found in the results as links, marking the chosen one", async () => {
    const user = setup("q=jeans&size=32");
    const sizeButton = screen.getByRole("button", { name: /SIZE · 32/ });
    await user.click(sizeButton);
    expect(sizeButton).toHaveAttribute("aria-expanded", "true");
    const panel = screen.getByRole("region", { name: "SIZE" });
    expect(within(panel).getByRole("link", { name: "30" })).toHaveAttribute("href", "/search?q=jeans&size=30");
    expect(within(panel).getByRole("link", { name: "32" })).toHaveAttribute("aria-current", "true");
  });

  it("says when there are no sizes to choose", async () => {
    const user = setup("q=zzz", "search", []);
    await user.click(screen.getByRole("button", { name: /SIZE/ }));
    expect(within(screen.getByRole("region", { name: "SIZE" })).getByText(/ไม่มีไซซ์/)).toBeInTheDocument();
  });

  it("offers price ranges and a custom range form that keeps the other filters", async () => {
    const user = setup("q=jeans&size=32&page=2");
    await user.click(screen.getByRole("button", { name: /PRICE/ }));
    const panel = screen.getByRole("region", { name: "PRICE" });
    expect(within(panel).getByRole("link", { name: "฿500–1,000" })).toHaveAttribute(
      "href",
      "/search?q=jeans&size=32&min=500&max=1000",
    );
    expect(within(panel).getByRole("link", { name: "ต่ำกว่า ฿500" })).toHaveAttribute("href", "/search?q=jeans&size=32&max=500");
    const form = within(panel).getByLabelText("ราคาต่ำสุด (บาท)").closest("form")!;
    expect(form).toHaveAttribute("action", "/search");
    const hidden = Object.fromEntries([...form.querySelectorAll<HTMLInputElement>("input[type=hidden]")].map((i) => [i.name, i.value]));
    expect(hidden).toEqual({ q: "jeans", size: "32" });
  });

  it("closes an open panel with Escape", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /PRICE/ }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "PRICE" })).toBeNull();
  });

  it("shows the active filters with remove links and CLEAR ALL", () => {
    setup("q=jeans&size=32&min=500&max=1000");
    const active = screen.getByRole("list", { name: "ตัวกรองที่เลือก" });
    expect(within(active).getByRole("link", { name: "เอาออก SIZE 32" })).toHaveAttribute("href", "/search?q=jeans&min=500&max=1000");
    expect(screen.getByRole("link", { name: "CLEAR ALL" })).toHaveAttribute("href", "/search?q=jeans");
  });

  it("opens a bottom sheet on phones with the same choices", async () => {
    const user = setup("q=jeans&size=32");
    await user.click(screen.getByRole("button", { name: "FILTER · 1" }));
    const sheet = screen.getByRole("dialog", { name: "ตัวกรอง" });
    expect(within(sheet).getByRole("link", { name: "30" })).toHaveAttribute("href", "/search?q=jeans&size=30");
    await user.click(within(sheet).getByRole("button", { name: "ปิด" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
