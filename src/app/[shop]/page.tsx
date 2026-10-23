import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/skeleton";
import { toUrlParams } from "@/components/results-page";
import { ShopView } from "@/components/shop-view";
import { getShopPage, shopArgs } from "@/lib/catalog/shop";

export async function generateMetadata(props: PageProps<"/[shop]">): Promise<Metadata> {
  const { shop } = await props.params;
  const page = await getShopPage(shop, null, "newest");
  return page ? { title: page.shop.name, description: page.shop.bio || undefined } : {};
}

async function ShopContent(props: PageProps<"/[shop]">) {
  const { shop } = await props.params;
  const params = toUrlParams(await props.searchParams);
  const { category, sort } = shopArgs(params);
  const page = await getShopPage(shop, category, sort);
  if (!page) notFound();
  return <ShopView page={page} category={category} sort={sort} params={params.toString()} />;
}

export default function ShopPage(props: PageProps<"/[shop]">) {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <ShopContent {...props} />
    </Suspense>
  );
}
