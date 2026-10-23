import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

// Proves React components render in jsdom and jest-dom matchers are registered.
describe("component test environment", () => {
  it("renders a React element into the DOM", () => {
    render(<button type="button">ลงขาย</button>);
    expect(screen.getByRole("button", { name: "ลงขาย" })).toBeInTheDocument();
  });
});
