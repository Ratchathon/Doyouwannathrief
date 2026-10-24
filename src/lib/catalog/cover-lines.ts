/** Cover lines and contents numbers for the homepage, built from live style numbers. */

/** One style's numbers on the homepage cover (from the style_stats function). */
export type StyleStat = {
  slug: string;
  name_en: string;
  name_th: string;
  pieces: number;
  shops: number;
  new_pieces: number;
  top_shop_name: string | null;
  top_shop_province: string | null;
};

export type CoverLine = {
  key: "lead" | "second" | "cheap" | "new-shops";
  tone: "lead" | "magenta" | "marker" | "plain";
  title: string;
  sub: string;
  href: string;
};

export const CHEAP_MAX_BAHT = 500;

/** Styles worth a cover line: most new pieces this week, then the most pieces, then menu order. */
function ranked(styles: StyleStat[]): StyleStat[] {
  return styles
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.pieces > 0)
    .sort((a, b) => b.s.new_pieces - a.s.new_pieces || b.s.pieces - a.s.pieces || a.i - b.i)
    .map(({ s }) => s);
}

function leadSub(s: StyleStat): string {
  const count = s.new_pieces > 0 ? `ใหม่ ${s.new_pieces} ชิ้นสัปดาห์นี้` : `${s.pieces} ชิ้น`;
  const from = s.shops > 1 ? `${s.top_shop_name} และอีก ${s.shops - 1} ร้าน` : `${s.top_shop_name} · ${s.top_shop_province}`;
  return `${count} จาก ${from}`;
}

function secondSub(s: StyleStat): string {
  return `${s.pieces} ชิ้น จาก ${s.shops > 1 ? `${s.shops} ร้าน` : s.top_shop_province}`;
}

/**
 * The cover lines, written from live numbers: the leading style, a second
 * style, pieces under ฿500 and new shops. Sections with nothing to show are left out.
 */
export function buildCoverLines({
  styles,
  cheap,
  newShops,
}: {
  styles: StyleStat[];
  cheap: number;
  newShops: { province: string }[];
}): CoverLine[] {
  const lines: CoverLine[] = [];
  const [lead, second] = ranked(styles);
  if (lead) {
    lines.push({ key: "lead", tone: "lead", title: lead.name_en.toUpperCase(), sub: leadSub(lead), href: `/styles/${lead.slug}` });
  }
  if (second) {
    lines.push({
      key: "second",
      tone: "magenta",
      title: second.name_en.toUpperCase(),
      sub: secondSub(second),
      href: `/styles/${second.slug}`,
    });
  }
  if (cheap > 0) {
    lines.push({
      key: "cheap",
      tone: "marker",
      title: `UNDER ฿${CHEAP_MAX_BAHT}`,
      sub: `${cheap} ชิ้นในงบห้าร้อย`,
      href: `/search?max=${CHEAP_MAX_BAHT}`,
    });
  }
  if (newShops.length > 0) {
    const provinces = [...new Set(newShops.map((s) => s.province))].slice(0, 3);
    lines.push({
      key: "new-shops",
      tone: "plain",
      title: `${newShops.length} NEW SHOP${newShops.length > 1 ? "S" : ""}`,
      sub: `เปิดใหม่ ${provinces.join(" · ")}`,
      href: "/shops",
    });
  }
  return lines;
}

/** Contents-page number: two digits at least, like a page number. */
export function contentsCount(n: number): string {
  return String(n).padStart(2, "0");
}
