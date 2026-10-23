// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isBot, viewerHash } from "@/lib/views/views";

describe("isBot", () => {
  it.each([
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "facebookexternalhit/1.1",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0",
    "Twitterbot/1.0",
    "",
  ])("treats %j as a bot", (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it("counts an ordinary phone browser", () => {
    expect(
      isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"),
    ).toBe(false);
  });
});

describe("viewerHash", () => {
  it("is a stable hex digest that never contains the raw id", async () => {
    const a = await viewerHash("2f1c3b2a-0000-4000-8000-000000000001");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await viewerHash("2f1c3b2a-0000-4000-8000-000000000001")).toBe(a);
    expect(await viewerHash("another")).not.toBe(a);
  });
});
