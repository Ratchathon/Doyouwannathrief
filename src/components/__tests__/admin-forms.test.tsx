import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportForm } from "@/components/report-form";
import { ReportUpdateForm, ShopReviewForm } from "@/components/admin-forms";

const ok = vi.fn(async () => ({ error: null }));

describe("ReportForm", () => {
  it("offers the reasons that fit a product and carries the product id", () => {
    render(<ReportForm action={ok} target={{ type: "product", id: "p1", name: "ยีนส์ 501" }} />);
    expect(screen.getByText(/ยีนส์ 501/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "สงสัยว่าเป็นของปลอม" })).toHaveAttribute("value", "counterfeit");
    expect(screen.queryByRole("radio", { name: "เว็บใช้งานไม่ได้หรือแสดงผิด" })).toBeNull();
    expect(document.querySelector('input[name="targetId"]')).toHaveValue("p1");
  });

  it("reports the website when nothing else is named", () => {
    render(<ReportForm action={ok} target={{ type: "website" }} />);
    expect(screen.getByRole("radio", { name: "เว็บใช้งานไม่ได้หรือแสดงผิด" })).toBeInTheDocument();
  });

  it("thanks the reporter once sent", async () => {
    const user = userEvent.setup();
    const sent = vi.fn(async () => ({ error: null, sent: true }));
    render(<ReportForm action={sent} target={{ type: "website" }} />);
    await user.click(screen.getByRole("radio", { name: "อื่นๆ" }));
    await user.type(screen.getByLabelText("เล่ารายละเอียด"), "ปุ่มค้นหากดไม่ได้ในมือถือ");
    await user.click(screen.getByRole("button", { name: "SEND REPORT" }));
    expect(await screen.findByRole("status")).toHaveTextContent("ได้รับเรื่องแล้ว");
  });
});

describe("ShopReviewForm", () => {
  it("approves or rejects with a reason the shop will see", () => {
    render(<ShopReviewForm action={ok} shopId="s1" />);
    expect(screen.getByRole("button", { name: "APPROVE" })).toHaveAttribute("value", "approve");
    expect(screen.getByRole("button", { name: "REJECT" })).toHaveAttribute("value", "reject");
    expect(screen.getByLabelText(/เหตุผลถ้าตีกลับ/)).toHaveAttribute("name", "reason");
  });
});

describe("ReportUpdateForm", () => {
  it("sets a status and an optional note", () => {
    render(<ReportUpdateForm action={ok} reportId="r1" status="open" />);
    expect(screen.getByLabelText("สถานะ")).toHaveValue("open");
    expect(screen.getByLabelText("บันทึกของแอดมิน")).toHaveAttribute("name", "note");
  });
});
