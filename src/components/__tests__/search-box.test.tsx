import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBox, type Suggestions } from "@/components/search-box";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const polo: Suggestions = {
  brands: [{ name: "Ralph Lauren" }],
  shops: [{ slug: "second-season", name: "SECOND SEASON", province: "ภูเก็ต", match_count: 3 }],
  styles: [{ slug: "designer", name_en: "Designer", name_th: "ดีไซเนอร์" }],
  categories: [{ value: "tops_shirts", count: 4 }],
};

function setup(fetcher = vi.fn<(q: string) => Promise<Suggestions>>(async () => polo), defaultValue = "") {
  const user = userEvent.setup();
  render(<SearchBox defaultValue={defaultValue} fetchSuggestions={fetcher} debounceMs={0} />);
  const input = screen.getByRole("combobox", { name: "ค้นหา" });
  return { user, input, fetcher };
}

beforeEach(() => push.mockClear());

describe("SearchBox", () => {
  it("is a GET search form for /search using q", () => {
    const { input } = setup(undefined, "polo");
    expect(input).toHaveValue("polo");
    expect(input).toHaveAttribute("name", "q");
    expect(input.closest("form")).toHaveAttribute("action", "/search");
  });

  it("does not ask for suggestions for a prefilled box nobody has touched", async () => {
    const fetcher = vi.fn<(q: string) => Promise<Suggestions>>(async () => polo);
    render(<SearchBox defaultValue="polo" fetchSuggestions={fetcher} debounceMs={0} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not ask for suggestions until 2 characters are typed", async () => {
    const { user, input, fetcher } = setup();
    await user.type(input, "p");
    expect(fetcher).not.toHaveBeenCalled();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("shows grouped suggestions linking to the right pages", async () => {
    const { user, input } = setup();
    await user.type(input, "polo");
    const list = await screen.findByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(within(list).getByRole("group", { name: "BRANDS" })).toBeInTheDocument();
    const option = (name: RegExp) => within(list).getByRole("option", { name });
    expect(option(/RALPH LAUREN/).querySelector("a")).toHaveAttribute("href", "/search?q=Ralph+Lauren");
    expect(option(/SECOND SEASON/).querySelector("a")).toHaveAttribute("href", "/second-season");
    expect(option(/DESIGNER/).querySelector("a")).toHaveAttribute("href", "/styles/designer");
    expect(option(/TOPS & SHIRTS/).querySelector("a")).toHaveAttribute("href", "/categories/tops_shirts?q=polo");
  });

  it("moves through suggestions with the arrow keys and opens one with Enter", async () => {
    const { user, input } = setup();
    await user.type(input, "polo");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const active = screen.getByRole("option", { name: /SECOND SEASON/ });
    expect(input).toHaveAttribute("aria-activedescendant", active.id);
    expect(active).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/second-season");
  });

  it("closes the suggestions with Escape", async () => {
    const { user, input } = setup();
    await user.type(input, "polo");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("ignores an older answer that arrives after a newer one", async () => {
    let resolveOld: (s: Suggestions) => void = () => {};
    const fetcher = vi.fn((q: string) =>
      q === "po" ? new Promise<Suggestions>((r) => (resolveOld = r)) : Promise.resolve(polo),
    );
    const { user, input } = setup(fetcher);
    await user.type(input, "po");
    await user.type(input, "l");
    await screen.findByRole("option", { name: /SECOND SEASON/ });
    resolveOld({ brands: [{ name: "Old Brand" }], shops: [], styles: [], categories: [] });
    await waitFor(() => expect(screen.queryByRole("option", { name: /OLD BRAND/ })).not.toBeInTheDocument());
  });

  it("shows nothing when there are no suggestions", async () => {
    const empty = { brands: [], shops: [], styles: [], categories: [] };
    const { user, input } = setup(vi.fn(async () => empty));
    await user.type(input, "zzz");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("stays usable as a plain search box when suggestions fail", async () => {
    const failing = vi.fn(async () => {
      throw new Error("offline");
    });
    const { user, input } = setup(failing);
    await user.type(input, "polo");
    await waitFor(() => expect(failing).toHaveBeenCalled());
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
