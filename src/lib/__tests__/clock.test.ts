import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));

import { issueMonth } from "@/lib/clock";

describe("issueMonth", () => {
  it("names the month and year in capitals", () => {
    expect(issueMonth(new Date("2026-10-24T08:00:00Z"))).toBe("OCT 2026");
  });

  it("uses Bangkok time, so late on the last day in UTC is already next month", () => {
    expect(issueMonth(new Date("2026-10-31T18:30:00Z"))).toBe("NOV 2026");
  });

  it("rolls over the year", () => {
    expect(issueMonth(new Date("2026-12-31T17:00:00Z"))).toBe("JAN 2027");
  });
});
