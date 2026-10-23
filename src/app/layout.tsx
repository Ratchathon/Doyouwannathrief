import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

// Fonts and design tokens are set once the design direction is approved.
export const metadata: Metadata = {
  title: APP_NAME,
  description: "รวมร้านเสื้อผ้ามือสองที่คัดแล้วจากทั่วประเทศ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
