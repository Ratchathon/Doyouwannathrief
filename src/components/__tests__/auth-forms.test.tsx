import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoButtons, ForgotForm, LoginForm, ResetForm, SignupForm } from "@/components/auth-forms";

const ok = vi.fn(async () => ({ error: null }));

describe("LoginForm", () => {
  it("has labelled email and password fields, keeps where to go next, and links to the other pages", () => {
    render(<LoginForm action={ok} next="/sell" />);
    expect(screen.getByLabelText("อีเมล")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("รหัสผ่าน")).toHaveAttribute("type", "password");
    expect(document.querySelector('input[name="next"]')).toHaveValue("/sell");
    expect(screen.getByRole("link", { name: "ลืมรหัสผ่าน?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "สมัครสมาชิก" })).toHaveAttribute("href", "/signup?next=%2Fsell");
  });

  it("shows the error the action returns", async () => {
    const user = userEvent.setup();
    const fail = vi.fn(async () => ({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }));
    render(<LoginForm action={fail} next="/" />);
    await user.type(screen.getByLabelText("อีเมล"), "a@b.co");
    await user.type(screen.getByLabelText("รหัสผ่าน"), "abcdefgh");
    await user.click(screen.getByRole("button", { name: "LOG IN" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  });

  it("shows an error passed in the address, e.g. from an expired link", () => {
    render(<LoginForm action={ok} next="/" initialError="ลิงก์หมดอายุหรือใช้ไปแล้ว ขอลิงก์ใหม่" />);
    expect(screen.getByRole("alert")).toHaveTextContent("ลิงก์หมดอายุ");
  });
});

describe("SignupForm", () => {
  it("asks for email and password and links back to log in", () => {
    render(<SignupForm action={ok} next="/" />);
    expect(screen.getByLabelText("อีเมล")).toBeInTheDocument();
    expect(screen.getByLabelText("รหัสผ่าน")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByRole("button", { name: "CREATE ACCOUNT" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "เข้าสู่ระบบ" })).toHaveAttribute("href", "/login");
  });

  it("tells the user to check their inbox when a confirmation was sent", async () => {
    const user = userEvent.setup();
    const sent = vi.fn(async () => ({ error: null, sent: true }));
    render(<SignupForm action={sent} next="/" />);
    await user.type(screen.getByLabelText("อีเมล"), "a@b.co");
    await user.type(screen.getByLabelText("รหัสผ่าน"), "abcdefgh");
    await user.click(screen.getByRole("button", { name: "CREATE ACCOUNT" }));
    expect(await screen.findByRole("status")).toHaveTextContent("เช็กอีเมล");
  });
});

describe("ForgotForm", () => {
  it("confirms a reset link was sent", async () => {
    const user = userEvent.setup();
    const sent = vi.fn(async () => ({ error: null, sent: true }));
    render(<ForgotForm action={sent} />);
    await user.type(screen.getByLabelText("อีเมล"), "a@b.co");
    await user.click(screen.getByRole("button", { name: "SEND RESET LINK" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ส่งลิงก์");
  });
});

describe("ResetForm", () => {
  it("asks for the new password twice", () => {
    render(<ResetForm action={ok} />);
    expect(screen.getByLabelText("รหัสผ่านใหม่")).toHaveAttribute("name", "password");
    expect(screen.getByLabelText("ยืนยันรหัสผ่านใหม่")).toHaveAttribute("name", "confirm");
  });
});

describe("DemoButtons", () => {
  it("offers a one-tap demo account for each role", () => {
    render(<DemoButtons action={ok} />);
    for (const name of ["BUYER", "SHOP", "ADMIN"]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /SHOP/ })).toHaveAttribute("value", "shop");
  });
});
