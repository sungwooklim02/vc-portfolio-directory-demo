import type { Metadata } from "next";
import "../globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeScript } from "@/components/ThemeScript";
import { withBase } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "Velmara Ventures — [DEMO] VC Portfolio Directory",
    template: "%s · Velmara Ventures [DEMO]",
  },
  description:
    "A fictional bilingual VC portfolio directory built as a static demo. All companies and data are fictional.",
  icons: { icon: withBase("/favicon.svg") },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeScript />
        <Header locale="en" />
        <main className="flex-1">{children}</main>
        <Footer locale="en" />
      </body>
    </html>
  );
}
