import type { Metadata } from "next";
import { Suspense } from "react";
import { DiscoverView } from "@/components/discover-view";
import { toUrlParams } from "@/components/results-page";
import { GridSkeleton } from "@/components/skeleton";
import { getDiscover } from "@/lib/catalog/discover";
import { isProvince } from "@/lib/shops/provinces";

export const metadata: Metadata = { title: "Discover" };

async function DiscoverContent(props: PageProps<"/discover">) {
  const raw = toUrlParams(await props.searchParams).get("province") ?? "";
  const data = await getDiscover(isProvince(raw) ? raw : null);
  return <DiscoverView data={data} />;
}

export default function DiscoverPage(props: PageProps<"/discover">) {
  return (
    <Suspense fallback={<GridSkeleton title="DISCOVER" />}>
      <DiscoverContent {...props} />
    </Suspense>
  );
}
