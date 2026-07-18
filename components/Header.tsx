import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { LangSwitch } from "./LangSwitch";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ locale }: { locale: Locale }) {
  const s = t(locale);
  const p = (path: string) => (locale === "en" ? path : path === "/" ? "/ko/" : `/ko${path}`);
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 sm:px-6">
        <Link
          href={p("/")}
          className="flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
            <rect width="48" height="48" rx="10" className="fill-zinc-900 dark:fill-zinc-100" />
            <path
              d="M13 14 L24 36 L35 14"
              fill="none"
              className="stroke-zinc-100 dark:stroke-zinc-900"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {s.brand}
          </span>
          <span
            data-demo-badge
            title={s.demoBadgeTitle}
            className="rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-amber-700 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-400"
          >
            {s.demoBadge}
          </span>
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full items-center gap-4 sm:order-none sm:w-auto sm:flex-1">
          <Link href={p("/")} className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-100">
            {s.navPortfolio}
          </Link>
          <Link href={p("/about/")} className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-100">
            {s.navAbout}
          </Link>
          <Link href={p("/demo/")} className="text-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-100">
            {s.navDemoNotes}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <LangSwitch locale={locale} />
          <ThemeToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
