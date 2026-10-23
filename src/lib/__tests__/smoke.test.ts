import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/lib/config";

// Proves the toolchain works: Vitest runs, TS compiles, and the "@/" path alias resolves.
describe("toolchain smoke test", () => {
  it("resolves the @/ alias and reads app config", () => {
    expect(APP_NAME).toBeTypeOf("string");
    expect(APP_NAME.length).toBeGreaterThan(0);
  });
});
