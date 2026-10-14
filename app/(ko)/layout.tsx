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
    default: "벨마라 벤처스 — VC 포트폴리오 디렉토리",
    template: "%s · 벨마라 벤처스",
  },
  description:
    "정적 사이트로 만든 가상의 이중 언어 VC 포트폴리오 디렉토리입니다. 모든 기업·데이터는 가상입니다.",
  icons: { icon: withBase("/favicon.svg") },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* self-hosted subset webfont (scripts/fonts/build-fonts.mjs): preload the faces this locale paints first */}
        {FONT_PRELOAD.ko.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
        ))}
        {/* shared motion kit (local, no CDN) — loaded after the app stylesheet; script is a classic sync script exposing window.MK */}
        <link rel="stylesheet" href={withBase("/mk/motion-kit.css")} />
      </head>
      <body suppressHydrationWarning className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeScript />
        <script src={withBase("/mk/motion-kit.js")} />
        <Header locale="ko" />
        <main className="flex-1">{children}</main>
        <Footer locale="ko" />
        <MotionRuntime />
      </body>
    </html>
  );
}
