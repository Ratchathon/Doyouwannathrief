import Link from "next/link";
import { timeLeft } from "@/lib/trade/time";

export const ORDER_STATUS: Record<string, { en: string; th: string; tone: "mark" | "line" | "ink" }> = {
  awaiting_payment: { en: "AWAITING PAYMENT", th: "รอชำระเงิน", tone: "mark" },
  paid: { en: "PAID", th: "จ่ายแล้ว รอร้านส่ง", tone: "mark" },
  shipped: { en: "SHIPPED", th: "ร้านส่งแล้ว", tone: "line" },
  completed: { en: "COMPLETED", th: "ได้ของแล้ว", tone: "ink" },
  cancelled: { en: "CANCELLED", th: "ยกเลิก", tone: "line" },
};

export const OFFER_STATUS: Record<string, { en: string; th: string; tone: "mark" | "line" | "ink" }> = {
  pending_shop: { en: "WAITING FOR SHOP", th: "รอร้านตอบ", tone: "mark" },
  countered: { en: "COUNTER OFFER", th: "ร้านเสนอกลับ", tone: "mark" },
  accepted: { en: "ACCEPTED", th: "ตกลงแล้ว", tone: "ink" },
  rejected: { en: "DECLINED", th: "ไม่รับ", tone: "line" },
  outbid: { en: "OUTBID", th: "มีคนเสนอสูงกว่า", tone: "line" },
  expired: { en: "EXPIRED", th: "หมดเวลา", tone: "line" },
  withdrawn: { en: "WITHDRAWN", th: "ถอนแล้ว", tone: "line" },
  closed: { en: "CLOSED", th: "ของถูกซื้อไปแล้ว", tone: "line" },
};

export function Tag({ en, th, tone }: { en: string; th: string; tone: "mark" | "line" | "ink" }) {
  const look = tone === "mark" ? "bg-highlight" : tone === "ink" ? "bg-print text-white" : "border-2 border-print";
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className={`wide inline-flex h-6 items-center px-2 text-[10px] ${look}`}>{en}</span>
      <span className="text-sm">{th}</span>
    </span>
  );
}

export function Deadline({ at }: { at: string | null }) {
  if (!at) return null;
  return <span className="text-sm font-semibold text-magenta-strong">{timeLeft(at)}</span>;
}

export function TradeRow({
  product,
  children,
  side,
}: {
  product: { id: string; title: string; photo: string | null; shopSlug: string; shopName: string };
  children: React.ReactNode;
  side?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap gap-4 border-b border-print py-5">
      <Link href={`/${product.shopSlug}/${product.id}`} className="size-24 shrink-0 overflow-hidden bg-photo">
        {product.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.photo} alt={product.title} className="size-full object-cover" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 basis-[220px] flex-col gap-1.5">
        <Link href={`/${product.shopSlug}/${product.id}`} className="line-clamp-2 font-semibold hover:text-magenta-strong">
          {product.title}
        </Link>
        <span className="wide text-[11px]">{product.shopName}</span>
        {children}
      </div>
      {side && <div className="flex w-full flex-col gap-3 sm:w-auto sm:max-w-[320px]">{side}</div>}
    </li>
  );
}

export function EmptyLine({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div>
      <p className="text-muted">{text}</p>
      <Link href={href} className="btn mt-5">
        {cta}
      </Link>
    </div>
  );
}

export function DemoBanner() {
  return (
    <p className="wide mb-6 inline-block bg-highlight px-3 py-1.5 text-[11px]">
      DEMO · ไม่มีการตัดเงินหรือส่งของจริง
    </p>
  );
}
