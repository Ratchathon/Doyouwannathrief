import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductView } from "@/components/product-view";
import { getProductPage } from "@/lib/catalog/shop";
import { formatBaht } from "@/lib/search/results";

export async function generateMetadata(props: PageProps<"/[shop]/[id]">): Promise<Metadata> {
  const { shop, id } = await props.params;
  const product = await getProductPage(shop, id);
  if (!product) return {};
  return {
    title: `${product.title} · ${formatBaht(product.priceSatang)}`,
    description: `${product.brand ?? ""} ไซซ์ ${product.sizeLabel} จากร้าน ${product.shop.name}`.trim(),
    openGraph: product.photos[0] ? { images: [product.photos[0].url] } : undefined,
  };
}

async function ProductContent(props: PageProps<"/[shop]/[id]">) {
  const { shop, id } = await props.params;
  const product = await getProductPage(shop, id);
  if (!product) notFound();
  return <ProductView product={product} />;
}

export default function ProductPage(props: PageProps<"/[shop]/[id]">) {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-center text-muted md:px-10">กำลังโหลด…</p>}>
      <ProductContent {...props} />
    </Suspense>
  );
}
