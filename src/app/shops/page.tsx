import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { toUrlParams } from "@/components/results-page";
import { ShopDiscRow } from "@/components/shop-disc";
import { GridSkeleton } from "@/components/skeleton";
import { getAllShops } from "@/lib/catalog/home";
import { isProvince } from "@/lib/shops/provinces";

export const metadata: Metadata = { title: "Shops" };

async function ShopsContent(props: PageProps<"/shops">) {
  const params = toUrlParams(await props.searchParams);
  const raw = params.get("province") ?? "";
  const province = isProvince(raw) ? raw : null;
  const shops = await getAllShops(province);
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pt-6 pb-24 md:px-10 md:pt-10">
      <h1 className="chrome-text font-display text-[clamp(56px,9vw,128px)] leading-[0.95] font-normal">SHOPS</h1>
      <p className="mt-2 text-[#b4b9bf]">
        {province ? `ร้านในจังหวัด${province} · ${shops.length} ร้าน` : `ร้านมือสองที่คัดแล้วทั้งหมด · ${shops.length} ร้าน`}
      </p>
      {province && (
        <Link href="/shops" className="mt-3 inline-flex h-10 items-center text-sm text-fg-soft underline underline-offset-4">
          ดูทุกจังหวัด
        </Link>
      )}
      <div className="mt-10">
        {shops.length === 0 ? (
          <p className="py-12 text-center text-muted">ยังไม่มีร้านในตอนนี้</p>
        ) : (
          <ShopDiscRow shops={shops} layout="grid" />
        )}
      </div>
    </div>
  );
}

export default function ShopsPage(props: PageProps<"/shops">) {
  return (
    <Suspense fallback={<GridSkeleton title="SHOPS" />}>
      <ShopsContent {...props} />
    </Suspense>
  );
}
