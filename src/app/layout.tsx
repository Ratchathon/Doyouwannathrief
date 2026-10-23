import type { Metadata, Viewport } from "next";
// Self-hosted fonts (each file covers its scripts via unicode-range).
import "@fontsource/anton/400.css";
import "@fontsource/archivo/500.css";
import "@fontsource/archivo/600.css";
import "@fontsource/anuphan/400.css";
import "@fontsource/anuphan/500.css";
import "@fontsource/anuphan/600.css";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getNavData } from "@/lib/catalog/nav";
import { currentYear } from "@/lib/clock";
import { APP_NAME } from "@/lib/config";
import { subscribeNewsletter } from "@/lib/newsletter/actions";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "รวมร้านเสื้อผ้ามือสองที่คัดสไตล์แล้วจากทั่วประเทศ",
};

export const viewport: Viewport = {
  themeColor: "#0b0c0e",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [nav, year] = await Promise.all([getNavData(), currentYear()]);
  return (
    <html lang="th" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 bg-fg px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          ข้ามไปเนื้อหา
        </a>
        <SiteHeader styles={nav.styles} shops={nav.shops} />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter year={year} newsletterAction={subscribeNewsletter} />
      </body>
    </html>
  );
}
