import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(async () => {
  cleanup();
  // Only loaded by database tests; avoids pulling Postgres into UI tests.
  const dbModule = globalThis.__closeTestDbs;
  if (dbModule) await dbModule();
});

declare global {
  var __closeTestDbs: (() => Promise<void>) | undefined;
}
