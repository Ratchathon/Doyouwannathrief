// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ rpc }) }));

const { buildCoverLines, contentsCount, getCover } = await import("@/lib/catalog/cover");
type StyleStat = import("@/lib/catalog/cover").StyleStat;

const stat = (slug: string, extra: Partial<StyleStat> = {}): StyleStat => ({
  slug,
  name_en: slug[0].toUpperCase() + slug.slice(1),
  name_th: slug,
  pieces: 0,
  shops: 0,
  new_pieces: 0,
  top_shop_name: null,
  top_shop_province: null,
  ...extra,
});

const vintage = stat("vintage", { pieces: 7, shops: 1, new_pieces: 3, top_shop_name: "TUEKDAENG VINTAGE", top_shop_province: "กรุงเทพมหานคร" });
const y2k = stat("y2k", { name_en: "Y2K", pieces: 6, shops: 1, new_pieces: 0, top_shop_name: "MILLENNIUM BUG", top_shop_province: "ขอนแก่น" });
const workwear = stat("workwear", { pieces: 8, shops: 2, new_pieces: 1, top_shop_name: "HARDWEAR CO.", top_shop_province: "นครราชสีมา" });

describe("buildCoverLines", () => {
  it("leads with the style that got the most new pieces this week", () => {
    const [lead] = buildCoverLines({ styles: [y2k, workwear, vintage], cheap: 0, newShops: [] });
    expect(lead).toEqual({
      key: "lead",
      tone: "lead",
      title: "VINTAGE",
      sub: "ใหม่ 3 ชิ้นสัปดาห์นี้ จาก TUEKDAENG VINTAGE · กรุงเทพมหานคร",
      href: "/styles/vintage",
    });
  });

  it("falls back to the biggest style when nothing is new, then menu order", () => {
    const quiet = [stat("streetwear", { pieces: 6, shops: 1, top_shop_name: "A", top_shop_province: "x" }), { ...workwear, new_pieces: 0 }];
    const [lead, second] = buildCoverLines({ styles: quiet, cheap: 0, newShops: [] });
    expect(lead).toMatchObject({ title: "WORKWEAR", sub: "8 ชิ้น จาก HARDWEAR CO. และอีก 1 ร้าน" });
    expect(second).toMatchObject({ tone: "magenta", title: "STREETWEAR" });
  });

  it("follows with a second style, then the cheap pieces and the new shops", () => {
    const lines = buildCoverLines({
      styles: [vintage, y2k, workwear],
      cheap: 10,
      newShops: [{ province: "เชียงใหม่" }, { province: "ภูเก็ต" }, { province: "เชียงใหม่" }],
    });
    expect(lines.map((l) => l.key)).toEqual(["lead", "second", "cheap", "new-shops"]);
    expect(lines[1]).toMatchObject({ title: "WORKWEAR", sub: "8 ชิ้น จาก 2 ร้าน", href: "/styles/workwear" });
    expect(lines[2]).toEqual({ key: "cheap", tone: "marker", title: "UNDER ฿500", sub: "10 ชิ้นในงบห้าร้อย", href: "/search?max=500" });
    expect(lines[3]).toEqual({ key: "new-shops", tone: "plain", title: "3 NEW SHOPS", sub: "เปิดใหม่ เชียงใหม่ · ภูเก็ต", href: "/shops" });
  });

  it("names the province when a style has a single shop", () => {
    const lines = buildCoverLines({ styles: [vintage, y2k], cheap: 0, newShops: [] });
    expect(lines[1]).toMatchObject({ title: "Y2K", sub: "6 ชิ้น จาก ขอนแก่น" });
  });

  it("says one new shop in the singular", () => {
    const lines = buildCoverLines({ styles: [], cheap: 0, newShops: [{ province: "ชลบุรี" }] });
    expect(lines).toEqual([expect.objectContaining({ title: "1 NEW SHOP", sub: "เปิดใหม่ ชลบุรี" })]);
  });

  it("leaves out styles with nothing on sale and empty sections", () => {
    expect(buildCoverLines({ styles: [stat("vintage"), stat("y2k")], cheap: 0, newShops: [] })).toEqual([]);
  });
});

describe("contentsCount", () => {
  it.each([
    [0, "00"],
    [7, "07"],
    [42, "42"],
    [130, "130"],
  ])("prints %i as %s", (n, text) => {
    expect(contentsCount(n)).toBe(text);
  });
});

describe("getCover", () => {
  beforeEach(() => rpc.mockReset());

  it("reads the style numbers and the count under ฿500", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "style_stats" ? { data: [vintage], error: null } : { data: 10, error: null },
    );
    expect(await getCover()).toEqual({ styles: [vintage], cheap: 10 });
    expect(rpc).toHaveBeenCalledWith("style_stats");
    expect(rpc).toHaveBeenCalledWith("count_on_sale", { p_max_satang: 50000 });
  });

  it("comes back empty when the database is unreachable", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    expect(await getCover()).toEqual({ styles: [], cheap: 0 });
  });
});
