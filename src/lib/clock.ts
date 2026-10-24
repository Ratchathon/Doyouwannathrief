import { cacheLife } from "next/cache";

/** The current year, cached for a day so pages can still be prerendered. */
export async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const MONTH = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", month: "short", year: "numeric" });

/** The masthead's issue line, e.g. "OCT 2026", in Bangkok time. */
export function issueMonth(date: Date): string {
  const parts = MONTH.formatToParts(date);
  const month = parts.find((p) => p.type === "month")!.value.toUpperCase();
  const year = parts.find((p) => p.type === "year")!.value;
  return `${month} ${year}`;
}

/** This month's issue line, cached for an hour so pages can still be prerendered. */
export async function currentIssue(): Promise<string> {
  "use cache";
  cacheLife("hours");
  return issueMonth(new Date());
}
