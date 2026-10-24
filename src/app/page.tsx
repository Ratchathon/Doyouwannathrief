import { HomeView } from "@/components/home-view";
import { buildCoverLines, getCover } from "@/lib/catalog/cover";
import { getHomeShops } from "@/lib/catalog/home";

export default async function HomePage() {
  const [{ styles, cheap }, shops] = await Promise.all([getCover(), getHomeShops()]);
  const lines = buildCoverLines({ styles, cheap, newShops: shops.filter((s) => s.isNew) });
  return <HomeView styles={styles} lines={lines} shops={shops} />;
}
