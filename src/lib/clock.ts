import { cacheLife } from "next/cache";

/** The current year, cached for a day so pages can still be prerendered. */
export async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
