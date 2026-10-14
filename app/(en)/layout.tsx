import type { Metadata } from "next";
import "../fonts.generated.css";
import "../globals.css";
import "../motion.css";
import "../uplift.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MotionRuntime } from "@/components/MotionRuntime";
import { ThemeScript } from "@/components/ThemeScript";
import { FONT_PRELOAD } from "@/lib/fonts.generated";
import { withBase } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "Velmara Ventures — VC Portfolio Directory",
    template: "%s · Velmara Ventures",
  },
  description:
    "A fictional bilingual VC portfolio directory built as a static site. All companies and data are fictional.",
  icons: { icon: withBase("/favicon.svg") },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* self-hosted subset webfont (scripts/fonts/build-fonts.mjs): preload the faces this locale paints first */}
        {FONT_PRELOAD.en.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
        {/* shared motion kit (local, no CDN) — loaded after the app stylesheet; script is a classic sync script exposing window.MK */}
        <link rel="stylesheet" href={withBase("/mk/motion-kit.css")} />
      </head>
      <body suppressHydrationWarning className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeScript />
        <script src={withBase("/mk/motion-kit.js")} />
        <Header locale="en" />
        <main className="flex-1">{children}</main>
        <Footer locale="en" />
        <MotionRuntime />
      </body>
    </html>
  );
}
