import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
// Self-hosted fonts (each file covers its scripts via unicode-range).
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource/anuphan/400.css";
import "@fontsource/anuphan/500.css";
import "@fontsource/anuphan/600.css";
import "@fontsource/anuphan/700.css";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getNavData } from "@/lib/catalog/nav";
import { currentIssue, currentYear } from "@/lib/clock";
import { APP_NAME } from "@/lib/config";
import { subscribeNewsletter } from "@/lib/newsletter/actions";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "รวมร้านเสื้อผ้ามือสองที่คัดสไตล์แล้วจากทั่วประเทศ",
};

export const viewport: Viewport = {
  themeColor: "#fbfbfa",
  colorScheme: "light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [nav, year, issue] = await Promise.all([getNavData(), currentYear(), currentIssue()]);
  return (
    <html
      lang="th"
      className="h-full antialiased"
      // Inline so the page keeps its paper colour even if a stylesheet is late or swapped mid-navigation.
      style={{ backgroundColor: "#fbfbfa", color: "#111111", colorScheme: "light" }}
    >
      <body className="flex min-h-full flex-col" style={{ backgroundColor: "#fbfbfa", color: "#111111" }}>
        <a
          href="#main"
          className="sr-only z-50 bg-print px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          ข้ามไปเนื้อหา
        </a>
        <SiteHeader styles={nav.styles} shops={nav.shops} issue={issue} />
        <main id="main" className="flex flex-1 flex-col">
          {/* Page changes and loaded sections crossfade; the header stays put. Styles in globals.css. */}
          <ViewTransition update="page" default="none">
            <div className="flex flex-1 flex-col">{children}</div>
          </ViewTransition>
        </main>
        <SiteFooter year={year} newsletterAction={subscribeNewsletter} />
      </body>
    </html>
  );
}
