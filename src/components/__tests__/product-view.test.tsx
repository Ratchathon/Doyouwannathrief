import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductView } from "@/components/product-view";
import type { ProductPage } from "@/lib/catalog/shop";

const product: ProductPage = {
  id: "i1",
  title: "เสื้อยืดทัวร์ ปี 1998",
  brand: "Harley-Davidson",
  description: "ผ้าบางนุ่ม",
  category: { value: "tees", en: "TEES" },
  sizeLabel: "L",
  priceSatang: 189000,
  conditionLabel: "มีร่องรอยใช้งาน",
  flawsNote: "รูเล็ก 2 จุด",
  measurements: [
    { label: "อก", cm: 56 },
    { label: "ยาว", cm: 74 },
  ],
  status: "active",
  shop: { slug: "tuekdaeng", name: "TUEKDAENG VINTAGE", province: "กรุงเทพมหานคร" },
  photos: [
    { kind: "front", url: "/p/front.webp" },
    { kind: "back", url: "/p/back.webp" },
    { kind: "label", url: "/p/label.webp" },
    { kind: "flaw", url: "/p/flaw.webp" },
  ],
  styles: [{ slug: "vintage", en: "VINTAGE" }],
};

const mainPhoto = () => screen.getByRole("img", { name: /เสื้อยืดทัวร์ ปี 1998 ·/ });

afterEach(() => vi.unstubAllGlobals());

describe("ProductView", () => {
  it("reports one view of the item", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductView product={product} />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/views");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(JSON.parse(init.body)).toEqual({ productId: "i1" });
  });

  it("shows the essentials: brand, title, price, size and condition", () => {
    render(<ProductView product={product} />);
    expect(screen.getByRole("heading", { level: 1, name: "เสื้อยืดทัวร์ ปี 1998" })).toBeInTheDocument();
    for (const text of ["HARLEY-DAVIDSON", "฿1,890", "มีร่องรอยใช้งาน", "ผ้าบางนุ่ม"]) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("SIZE ON LABEL").nextSibling).toHaveTextContent("L");
  });

  it("lists the measurements in centimetres", () => {
    render(<ProductView product={product} />);
    const list = screen.getByRole("list", { name: "ขนาด (ซม.)" });
    expect(within(list).getByText("56").parentElement).toHaveTextContent("อก");
    expect(within(list).getByText("74").parentElement).toHaveTextContent("ยาว");
  });

  it("fetches the main photo before anything else", () => {
    render(<ProductView product={product} />);
    expect(mainPhoto()).toHaveAttribute("fetchpriority", "high");
  });

  it("starts on the front photo and switches photos with the buttons", async () => {
    const user = userEvent.setup();
    render(<ProductView product={product} />);
    expect(mainPhoto()).toHaveAttribute("src", "/p/front.webp");
    await user.click(screen.getByRole("button", { name: "ดูรูปด้านหลัง" }));
    expect(mainPhoto()).toHaveAttribute("src", "/p/back.webp");
    expect(screen.getByRole("button", { name: "ดูรูปด้านหลัง" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the flaw note with a shortcut to the flaw photo", async () => {
    const user = userEvent.setup();
    render(<ProductView product={product} />);
    expect(screen.getByText("รูเล็ก 2 จุด")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "ดูจุดตำหนิในรูป" }));
    expect(mainPhoto()).toHaveAttribute("src", "/p/flaw.webp");
  });

  it("has no flaw box when there are no flaws", () => {
    render(<ProductView product={{ ...product, flawsNote: null, photos: product.photos.slice(0, 3) }} />);
    expect(screen.queryByText("FLAWS")).not.toBeInTheDocument();
  });

  it("opens on the flaw photo when the link says #photo-flaw", () => {
    window.location.hash = "#photo-flaw";
    render(<ProductView product={product} />);
    expect(mainPhoto()).toHaveAttribute("src", "/p/flaw.webp");
    act(() => {
      window.location.hash = "";
    });
  });

  it("links to the shop, category and styles, and to reporting", () => {
    render(<ProductView product={product} />);
    expect(screen.getAllByRole("link", { name: /TUEKDAENG VINTAGE/ })[0]).toHaveAttribute("href", "/tuekdaeng");
    expect(screen.getByRole("link", { name: "TEES" })).toHaveAttribute("href", "/categories/tees");
    expect(screen.getByRole("link", { name: "VINTAGE" })).toHaveAttribute("href", "/styles/vintage");
    expect(screen.getByRole("link", { name: "แจ้งปัญหาสินค้านี้" })).toHaveAttribute("href", "/report?product=i1");
  });

  it("buys now with a demo payment, carrying the item id", () => {
    const buyNow = vi.fn(async () => ({ error: null }));
    const makeOffer = vi.fn(async () => ({ error: null }));
    render(<ProductView product={product} trade={{ buyNow, makeOffer }} />);
    const buy = screen.getAllByRole("button", { name: "BUY NOW" })[0];
    expect(buy).toBeEnabled();
    expect(buy.closest("form")!.querySelector('input[name="productId"]')).toHaveValue("i1");
    expect(screen.getAllByText(/เดโม/).length).toBeGreaterThan(0);
  });

  it("opens an offer form and shows the answer", async () => {
    const user = userEvent.setup();
    const buyNow = vi.fn(async () => ({ error: null }));
    const makeOffer = vi.fn(async () => ({ error: null, message: "ส่งข้อเสนอแล้ว ร้านจะตอบภายใน 24 ชั่วโมง" }));
    render(<ProductView product={product} trade={{ buyNow, makeOffer }} />);
    await user.click(screen.getAllByRole("button", { name: "MAKE AN OFFER" })[0]);
    const dialog = screen.getByRole("dialog", { name: "MAKE AN OFFER" });
    await user.type(within(dialog).getByLabelText("ราคาที่เสนอ (บาท)"), "1500");
    await user.click(within(dialog).getByRole("button", { name: "SEND OFFER" }));
    expect(await within(dialog).findByRole("status")).toHaveTextContent("ส่งข้อเสนอแล้ว");
  });

  it("explains that buying is not open where no trade actions are wired", () => {
    render(<ProductView product={product} />);
    for (const name of ["BUY NOW", "MAKE AN OFFER"]) {
      for (const button of screen.getAllByRole("button", { name })) expect(button).toBeDisabled();
    }
  });

  it.each([
    ["reserved", "RESERVED"],
    ["sold", "SOLD"],
  ])("marks a %s item clearly", (status, label) => {
    render(<ProductView product={{ ...product, status }} />);
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "BUY NOW" })).not.toBeInTheDocument();
  });
});
