"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";

/**
 * Page-correspondence language switch: /about/ <-> /ko/about/ etc.
 * On the directory it carries the current filter query (sector/status/city ids and years are
 * language-independent), so switching language keeps the same view.
 */
export function LangSwitch({ locale }: { locale: Locale }) {
  const s = t(locale);
  const pathname = usePathname() || "/";
  const [search, setSearch] = useState("");
  const isKo = pathname === "/ko" || pathname.startsWith("/ko/");
  const isHome = pathname === "/" || pathname === "/ko" || pathname === "/ko/";

  useEffect(() => {
    if (!isHome) {
      setSearch("");
      return;
    }
    setSearch(window.location.search);
    const onUrl = (e: Event) => setSearch((e as CustomEvent<{ search: string }>).detail?.search ?? "");
    window.addEventListener("vpd:url", onUrl);
    return () => window.removeEventListener("vpd:url", onUrl);
  }, [isHome]);

  const base = isKo ? pathname.replace(/^\/ko\/?/, "/") || "/" : pathname === "/" ? "/ko/" : `/ko${pathname}`;
  // a Hangul search term means nothing on the English page, so it stays behind; everything else carries over
  const carried = (() => {
    if (!search) return "";
    const p = new URLSearchParams(search);
    if (/[\u3131-\u318E\uAC00-\uD7A3]/.test(p.get("q") ?? "")) p.delete("q");
    const str = p.toString();
    return str ? `?${str}` : "";
  })();
  return (
    <Link
      href={base + carried}
      aria-label={s.langSwitchLabel}
      className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-2.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {s.langSwitch}
    </Link>
  );
}
