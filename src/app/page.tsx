import { HomeView } from "@/components/home-view";
import { getHomeShops } from "@/lib/catalog/home";
import { getNavData } from "@/lib/catalog/nav";

export default async function HomePage() {
  const [{ styles }, shops] = await Promise.all([getNavData(), getHomeShops()]);
  return <HomeView styles={styles} shops={shops} />;
}
