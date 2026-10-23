import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "@/components/filter-bar";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function setup(params = "q=jeans", scope: "search" | "style" | "category" = "search", sizes = ["32", "30", "M", "L"]) {
  const user = userEvent.setup();
  render(<FilterBar path="/search" params={params} scope={scope} sizes={sizes} />);
  return user;
}

const pushed = () => new URL(push.mock.calls.at(-1)![0], "http://x");

beforeEach(() => push.mockClear());

describe("FilterBar on desktop", () => {
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

  it("lets you pick several sizes, stays open, and applies them together", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /^SIZE/ }));
    const panel = screen.getByRole("region", { name: "SIZE" });
    await user.click(within(panel).getByRole("button", { name: "M" }));
    await user.click(within(panel).getByRole("button", { name: "L" }));
    expect(within(panel).getByRole("button", { name: "M" })).toHaveAttribute("aria-pressed", "true");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "SIZE" })).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "APPLY" }));
    expect(pushed().searchParams.get("size")).toBe("M,L");
    expect(pushed().searchParams.get("q")).toBe("jeans");
    expect(screen.queryByRole("region", { name: "SIZE" })).toBeNull();
  });

  it("keeps picks from other panels until applying", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /^CATEGORY/ }));
    await user.click(within(screen.getByRole("region", { name: "CATEGORY" })).getByRole("button", { name: "TEES" }));
    await user.click(within(screen.getByRole("region", { name: "CATEGORY" })).getByRole("button", { name: "SWEATS" }));
    await user.click(screen.getByRole("button", { name: /^PRICE/ }));
    const price = screen.getByRole("region", { name: "PRICE" });
    await user.click(within(price).getByRole("button", { name: "฿500–1,000" }));
    await user.click(within(price).getByRole("button", { name: "APPLY" }));
    const url = pushed();
    expect(url.searchParams.get("category")).toBe("tees,sweats");
    expect([url.searchParams.get("min"), url.searchParams.get("max")]).toEqual(["500", "1000"]);
  });

  it("starts from the filters already in the URL and lets you untick one", async () => {
    const user = setup("q=jeans&size=32,30&page=3");
    await user.click(screen.getByRole("button", { name: /^SIZE/ }));
    const panel = screen.getByRole("region", { name: "SIZE" });
    expect(within(panel).getByRole("button", { name: "32" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(panel).getByRole("button", { name: "32" }));
    await user.click(within(panel).getByRole("button", { name: "APPLY" }));
    expect(pushed().searchParams.get("size")).toBe("30");
    expect(pushed().searchParams.get("page")).toBeNull();
  });

  it("takes a typed price range", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /^PRICE/ }));
    const panel = screen.getByRole("region", { name: "PRICE" });
    await user.type(within(panel).getByLabelText("ราคาต่ำสุด (บาท)"), "300");
    await user.type(within(panel).getByLabelText("ราคาสูงสุด (บาท)"), "800");
    await user.click(within(panel).getByRole("button", { name: "APPLY" }));
    expect([pushed().searchParams.get("min"), pushed().searchParams.get("max")]).toEqual(["300", "800"]);
  });

  it("says when there are no sizes to choose", async () => {
    const user = setup("q=zzz", "search", []);
    await user.click(screen.getByRole("button", { name: /^SIZE/ }));
    expect(within(screen.getByRole("region", { name: "SIZE" })).getByText(/ไม่มีไซซ์/)).toBeInTheDocument();
  });

  it("closes without applying on Escape", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: /^SIZE/ }));
    await user.click(within(screen.getByRole("region", { name: "SIZE" })).getByRole("button", { name: "M" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "SIZE" })).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows one removable chip per chosen value, plus CLEAR ALL", () => {
    setup("q=jeans&size=32,30&min=500&max=1000");
    const active = screen.getByRole("list", { name: "ตัวกรองที่เลือก" });
    expect(within(active).getByRole("link", { name: "เอาออก SIZE 32" })).toHaveAttribute(
      "href",
      "/search?q=jeans&size=30&min=500&max=1000",
    );
    expect(screen.getByRole("link", { name: "CLEAR ALL" })).toHaveAttribute("href", "/search?q=jeans");
  });
});

describe("FilterBar on phones", () => {
  it("collects choices in a bottom sheet and applies them with one tap", async () => {
    const user = setup("q=jeans&size=32");
    await user.click(screen.getByRole("button", { name: "FILTER · 1" }));
    const sheet = screen.getByRole("dialog", { name: "ตัวกรอง" });
    await user.click(within(sheet).getByRole("button", { name: "DENIM" }));
    await user.click(within(sheet).getByRole("button", { name: "M" }));
    await user.click(within(sheet).getByRole("button", { name: "ต่ำกว่า ฿500" }));
    expect(screen.getByRole("dialog", { name: "ตัวกรอง" })).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "APPLY" }));
    const url = pushed();
    expect(url.searchParams.get("category")).toBe("denim");
    expect(url.searchParams.get("size")).toBe("32,M");
    expect(url.searchParams.get("max")).toBe("500");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("clears every choice in the sheet without leaving it", async () => {
    const user = setup("q=jeans&size=32&min=500");
    await user.click(screen.getByRole("button", { name: "FILTER · 2" }));
    const sheet = screen.getByRole("dialog", { name: "ตัวกรอง" });
    await user.click(within(sheet).getByRole("button", { name: "CLEAR" }));
    expect(within(sheet).getByRole("button", { name: "32" })).toHaveAttribute("aria-pressed", "false");
    await user.click(within(sheet).getByRole("button", { name: "APPLY" }));
    expect(pushed().search).toBe("?q=jeans");
  });

  it("closes without applying", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "FILTER" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "ปิด" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
