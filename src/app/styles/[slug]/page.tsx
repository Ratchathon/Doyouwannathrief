import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResultsFallback, ResultsPage } from "@/components/results-page";
import { getNavData } from "@/lib/catalog/nav";

async function findStyle(slug: string) {
  const { styles } = await getNavData();
  return styles.find((s) => s.slug === slug) ?? null;
}

// Styles seeded by the first migration; used if the database is unreachable at build time.
const SEEDED_STYLES = ["streetwear", "vintage", "designer", "y2k", "korean-japanese", "workwear"];

export async function generateStaticParams() {
  const { styles } = await getNavData();
  const slugs = styles.length > 0 ? styles.map((s) => s.slug) : SEEDED_STYLES;
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/styles/[slug]">): Promise<Metadata> {
  const style = await findStyle((await props.params).slug);
  return { title: style ? style.name_en : "Style" };
}

export default async function StylePage(props: PageProps<"/styles/[slug]">) {
  const { slug } = await props.params;
  const style = await findStyle(slug);
  if (!style) notFound();
  const title = style.name_en.toUpperCase();
  return (
    <Suspense fallback={<ResultsFallback title={title} />}>
      <ResultsPage
        scope={{ kind: "style", slug }}
        path={`/styles/${slug}`}
        title={title}
        description={style.name_th ? `ร้านและของสาย${style.name_th}` : undefined}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}
