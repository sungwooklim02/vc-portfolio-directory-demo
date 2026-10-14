"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, Icons } from "@/components/icons";
import { LAST_QUERY_KEY } from "@/lib/dirState";
import { cameFrom } from "@/lib/nav";
import type { Locale } from "@/lib/i18n";

/**
 * "Back to portfolio" that returns to the directory as the visitor left it: when the previous in-app page
 * was the directory, it goes back in history (filters, search and scroll position restored); after a
 * reload or from a shared link, it links to the directory with the last filter query of this tab.
 * With motion on, MotionRuntime takes the click into a View Transition and honours data-back the same way.
 */
export function BackToDirectory({ locale, label }: { locale: Locale; label: string }) {
  const home = locale === "en" ? "/" : "/ko/";
  const [href, setHref] = useState(home);
  useEffect(() => {
    try {
      const q = sessionStorage.getItem(`${LAST_QUERY_KEY}-${locale}`);
      if (q && q.startsWith("?")) setHref(home + q);
    } catch {
      /* storage blocked: plain directory link */
    }
  }, [home, locale]);
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (cameFrom(home)) {
      e.preventDefault();
      window.history.back();
    }
  };
  return (
    <Link
      href={href}
      onClick={onClick}
      data-back
      data-mk-enter
      className="vpd-back inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <Icon icon={Icons.arrowLeft} />
      {label}
    </Link>
  );
}
