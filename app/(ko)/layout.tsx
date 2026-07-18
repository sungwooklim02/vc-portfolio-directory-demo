import type { Metadata } from "next";
import "../globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeScript } from "@/components/ThemeScript";
import { withBase } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "벨마라 벤처스 — [데모] VC 포트폴리오 디렉토리",
    template: "%s · 벨마라 벤처스 [데모]",
  },
  description:
    "정적 데모로 만든 가상의 이중 언어 VC 포트폴리오 디렉토리입니다. 모든 기업·데이터는 가상입니다.",
  icons: { icon: withBase("/favicon.svg") },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <ThemeScript />
        <Header locale="ko" />
        <main className="flex-1">{children}</main>
        <Footer locale="ko" />
      </body>
    </html>
  );
}
