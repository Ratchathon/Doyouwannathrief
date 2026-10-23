import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "@/components/site-footer";

describe("SiteFooter", () => {
  it("has a labelled newsletter email field and subscribe button", () => {
    render(<SiteFooter year={2026} />);
    expect(screen.getByRole("heading", { name: "SIGN UP TO OUR NEWSLETTER" })).toBeInTheDocument();
    const email = screen.getByLabelText("อีเมล");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toBeRequired();
    expect(screen.getByRole("button", { name: "SUBSCRIBE" })).toBeInTheDocument();
  });

  it.each(["CUSTOMER SERVICE", "SHIPPING", "CONTACT US", "FOLLOW US"])("has the %s column", (name) => {
    render(<SiteFooter year={2026} />);
    expect(screen.getByRole("heading", { name })).toBeInTheDocument();
  });

  it("links to selling and reporting", () => {
    render(<SiteFooter year={2026} />);
    expect(screen.getByRole("link", { name: "OPEN YOUR SHOP" })).toHaveAttribute("href", "/sell/apply");
    expect(screen.getByRole("link", { name: "REPORT A PROBLEM" })).toHaveAttribute("href", "/report");
  });

  it("labels the social icon links", () => {
    render(<SiteFooter year={2026} />);
    for (const name of ["Instagram", "TikTok", "Facebook"]) expect(screen.getByRole("link", { name })).toBeInTheDocument();
  });

  it("shows the given year in the copyright", () => {
    render(<SiteFooter year={2026} />);
    expect(screen.getByText(/© 2026 DOYOUWANNATHRIFT/)).toBeInTheDocument();
  });
});
