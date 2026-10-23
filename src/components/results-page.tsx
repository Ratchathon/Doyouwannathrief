import { FilterBar } from "@/components/filter-bar";
import { ResultsView } from "@/components/results-view";
import { SearchBox } from "@/components/search-box";
import { GridSkeleton } from "@/components/skeleton";
import { getNavData } from "@/lib/catalog/nav";
import { getResults, pageLinks } from "@/lib/catalog/results";
import { resultsArgs, type ResultsScope } from "@/lib/search/results";

type SearchParams = Record<string, string | string[] | undefined>;

export function toUrlParams(raw: SearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined && first !== "") params.set(key, first);
  }
  return params;
}

/** Loads and renders a two-pane results page. Wrap in Suspense: it reads the request's search params. */
export async function ResultsPage({
  scope,
  path,
  title,
  description,
  searchParams,
  withSearchBox = false,
}: {
  scope: ResultsScope;
  path: string;
  title: string | ((query: string | null) => string);
  description?: string;
  searchParams: Promise<SearchParams>;
  /** Show an editable search box above the results (the search page). */
  withSearchBox?: boolean;
}) {
  const params = toUrlParams(await searchParams);
  const args = resultsArgs(scope, params);
  const { styles } = await getNavData();
  const results = await getResults(
    args.items,
    args.shops,
    args.facets,
    styles.map((s) => [s.slug, s.name_en]),
  );
  return (
    <ResultsView
      search={
        withSearchBox ? (
          <SearchBox
            key={args.items.p_query ?? ""}
            defaultValue={args.items.p_query ?? ""}
            size="compact"
            autoFocus={!args.items.p_query}
          />
        ) : undefined
      }
      filters={<FilterBar path={path} params={params.toString()} scope={scope.kind} sizes={results.sizes} />}
      title={typeof title === "function" ? title(args.items.p_query) : title}
      description={description}
      path={path}
      params={params.toString()}
      sort={args.items.p_sort}
      shops={results.shops}
      items={results.items}
      {...pageLinks(path, params, results.hasMore)}
    />
  );
}

export function ResultsFallback({ title }: { title: string }) {
  return <GridSkeleton title={title} />;
}
