import type { Metadata } from "next";
import { Suspense } from "react";
import { ResultsFallback, ResultsPage } from "@/components/results-page";

export const metadata: Metadata = { title: "Search" };

const title = (query: string | null) => (query ? `RESULTS FOR “${query.toUpperCase()}”` : "ALL ITEMS");

export default function SearchPage(props: PageProps<"/search">) {
  return (
    <Suspense fallback={<ResultsFallback title="SEARCH" />}>
      <ResultsPage
        scope={{ kind: "search" }}
        path="/search"
        title={title}
        searchParams={props.searchParams}
        withSearchBox
      />
    </Suspense>
  );
}
