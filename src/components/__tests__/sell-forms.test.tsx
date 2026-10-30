import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplyForm } from "@/components/sell/apply-form";
import { ListingForm } from "@/components/sell/listing-form";
import { PhotoSlots } from "@/components/sell/photo-slots";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/products/upload", () => ({ uploadPhoto: vi.fn(async () => null) }));
vi.mock("@/lib/products/photo-actions", () => ({ removePhoto: vi.fn(async () => ({ error: null })) }));

const styles = [
  { slug: "vintage", name_en: "Vintage" },
  { slug: "y2k", name_en: "Y2K" },
];
const ok = vi.fn(async () => ({ error: null }));

describe("ApplyForm", () => {
  it("asks for the shop's name, link, province, styles and social links", () => {
    render(<ApplyForm action={ok} styles={styles} />);
    expect(screen.getByLabelText("ชื่อร้าน")).toHaveAttribute("name", "displayName");
    expect(screen.getByLabelText(/ลิงก์ร้าน/)).toHaveAttribute("name", "slug");
    expect(screen.getByLabelText("จังหวัด")).toHaveAttribute("name", "province");
    expect(screen.getByRole("checkbox", { name: "VINTAGE" })).toHaveAttribute("name", "styles");
    expect(screen.getAllByLabelText(/ลิงก์โซเชียล/)).toHaveLength(3);
  });

  it("previews the shop's address as the link is typed", async () => {
    const user = userEvent.setup();
    render(<ApplyForm action={ok} styles={styles} />);
    await user.type(screen.getByLabelText(/ลิงก์ร้าน/), "My-Shop");
    expect(screen.getByText(/\/my-shop$/)).toBeInTheDocument();
  });

  it("shows each field's error next to it and keeps what was typed", async () => {
    const user = userEvent.setup();
    const fail = vi.fn(async () => ({
      error: null,
      fieldErrors: { slug: "มีร้านใช้ชื่อลิงก์นี้แล้ว ลองชื่ออื่น" },
      values: { displayName: "ร้านเรา", slug: "taken", province: "", bio: "", styles: [], socialLinks: [] },
    }));
    render(<ApplyForm action={fail} styles={styles} />);
    void user;
    // Skip the browser's own required-field check; the server answer is what is under test.
    await act(async () => fireEvent.submit(screen.getByRole("button", { name: "SEND APPLICATION" }).closest("form")!));
    expect(await screen.findByText("มีร้านใช้ชื่อลิงก์นี้แล้ว ลองชื่ออื่น")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อร้าน")).toHaveValue("ร้านเรา");
  });
});

describe("ListingForm", () => {
  it("marks the measurements this category needs", async () => {
    const user = userEvent.setup();
    render(<ListingForm action={ok} styles={styles} />);
    await user.selectOptions(screen.getByLabelText("หมวด"), "bottoms");
    expect(screen.getByLabelText(/เอว/)).toBeRequired();
    expect(screen.getByLabelText(/อก/)).not.toBeRequired();
  });

  it("asks what the flaws are only when the item has flaws", async () => {
    const user = userEvent.setup();
    render(<ListingForm action={ok} styles={styles} />);
    expect(screen.queryByLabelText("ตำหนิคืออะไร อยู่ตรงไหน")).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: /มีตำหนิ/ }));
    expect(screen.getByLabelText("ตำหนิคืออะไร อยู่ตรงไหน")).toBeRequired();
  });

  it("fills in an existing item for editing", () => {
    render(
      <ListingForm
        action={ok}
        styles={styles}
        productId="p1"
        initial={{
          title: "ยีนส์ 501", brand: "Levi's", description: "", category: "denim", sizeLabel: "32", price: "1290",
          condition: "good", hasFlaws: false, flawsNote: "", chest: "", length: "104", shoulder: "", waist: "41",
          styles: ["vintage"],
        }}
      />,
    );
    expect(screen.getByLabelText("ชื่อสินค้า")).toHaveValue("ยีนส์ 501");
    expect(screen.getByRole("checkbox", { name: "VINTAGE" })).toBeChecked();
    expect(document.querySelector('input[name="productId"]')).toHaveValue("p1");
    expect(screen.getByRole("button", { name: "SAVE" })).toBeInTheDocument();
  });
});

describe("PhotoSlots", () => {
  it("shows a slot for each required photo and says which are missing", () => {
    render(
      <PhotoSlots
        shopId="s"
        productId="p"
        hasFlaws
        photos={[{ id: "1", kind: "front", url: "/f.webp" }]}
      />,
    );
    const slots = screen.getByRole("list", { name: "รูปสินค้า" });
    expect(within(slots).getByRole("img", { name: "ด้านหน้า" })).toBeInTheDocument();
    expect(within(slots).getByLabelText("อัปโหลดรูป ด้านหลัง")).toHaveAttribute("type", "file");
    expect(within(slots).getByLabelText("อัปโหลดรูป ตำหนิ")).toBeInTheDocument();
    expect(screen.getByText(/ยังขาดรูป/)).toHaveTextContent("ด้านหลัง");
  });
});
