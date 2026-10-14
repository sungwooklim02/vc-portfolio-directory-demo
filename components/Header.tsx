import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { FirmMark } from "./FirmMark";
import { LangSwitch } from "./LangSwitch";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ locale }: { locale: Locale }) {
  const s = t(locale);
  const p = (path: string) => (locale === "en" ? path : path === "/" ? "/ko/" : `/ko${path}`);
  return (
    <header className="venture-header sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/85">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 sm:px-6">
        <Link
          href={p("/")}
          className="flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
        >
          <FirmMark className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {s.brand}
          </span>
          <span
            data-fiction-badge
            title={s.fictionBadgeTitle}
            className="rounded-full border border-amber-400/60 bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-widest text-amber-700 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-400"
          >
            {s.fictionBadge}
          </span>
        </Link>
        <NavLinks
          items={[
            { href: p("/"), label: s.navPortfolio },
            { href: p("/about/"), label: s.navAbout },
            { href: p("/demo/"), label: s.navSiteNotes },
          ]}
        />
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <LangSwitch locale={locale} />
          <ThemeToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
