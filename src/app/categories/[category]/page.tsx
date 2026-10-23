import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResultsFallback, ResultsPage } from "@/components/results-page";
import { CATEGORIES, type Category } from "@/lib/products/listing";

const isCategory = (value: string): value is Category => Object.hasOwn(CATEGORIES, value);

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata(props: PageProps<"/categories/[category]">): Promise<Metadata> {
  const { category } = await props.params;
  return { title: isCategory(category) ? CATEGORIES[category].en : "Category" };
}

export default async function CategoryPage(props: PageProps<"/categories/[category]">) {
  const { category } = await props.params;
  if (!isCategory(category)) notFound();
  const { en, th } = CATEGORIES[category];
  return (
    <Suspense fallback={<ResultsFallback title={en} />}>
      <ResultsPage
        scope={{ kind: "category", category }}
        path={`/categories/${category}`}
        title={en}
        description={th}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}
