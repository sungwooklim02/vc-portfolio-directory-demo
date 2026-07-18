"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

/** Page-correspondence language switch: /about/ <-> /ko/about/ etc. */
export function LangSwitch({ locale }: { locale: Locale }) {
  const s = t(locale);
  const pathname = usePathname() || "/";
  const isKo = pathname === "/ko" || pathname.startsWith("/ko/");
  const target = isKo
    ? pathname.replace(/^\/ko\/?/, "/") || "/"
    : pathname === "/"
      ? "/ko/"
      : `/ko${pathname}`;
  return (
    <Link
      href={target}
      aria-label={s.langSwitchLabel}
      className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {s.langSwitch}
    </Link>
  );
}
