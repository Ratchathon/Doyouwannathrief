import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AmountForm, TradeButton } from "@/components/trade";
import { timeLeft } from "@/lib/trade/time";

describe("timeLeft", () => {
  const now = new Date("2026-10-30T10:00:00Z");
  it.each([
    ["2026-10-30T19:30:00Z", "เหลือ 9 ชม. 30 นาที"],
    ["2026-10-30T10:20:00Z", "เหลือ 20 นาที"],
    ["2026-10-30T09:59:00Z", "หมดเวลาแล้ว"],
  ])("%s → %s", (deadline, text) => {
    expect(timeLeft(deadline, now)).toBe(text);
  });
});

describe("TradeButton", () => {
  it("sends its hidden fields and shows the result", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: unknown, form: FormData) => ({ error: null, message: `ok ${form.get("orderId")}` }));
    render(<TradeButton action={action} fields={{ orderId: "o1" }} label="RECEIVED" />);
    await user.click(screen.getByRole("button", { name: "RECEIVED" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ok o1");
  });
});

describe("AmountForm", () => {
  it("asks for an amount with a label and sends the answer", async () => {
    const user = userEvent.setup();
    const action = vi.fn(async (_s: unknown, form: FormData) => ({ error: `${form.get("answer")} ${form.get("amount")}` }));
    render(<AmountForm action={action} fields={{ offerId: "f1", answer: "counter" }} label="ราคาที่เสนอกลับ (บาท)" submit="COUNTER" />);
    await user.type(screen.getByLabelText("ราคาที่เสนอกลับ (บาท)"), "450");
    await user.click(screen.getByRole("button", { name: "COUNTER" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("counter 450");
  });
});
