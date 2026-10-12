"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { mk } from "@/lib/mk";

const LINK =
  "text-sm text-zinc-600 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-400 dark:hover:text-zinc-100";

const norm = (p: string) => (p.endsWith("/") ? p : p + "/");

/** Main nav with aria-current and a sliding underline that glides to the current page. */
export function NavLinks({ items }: { items: Array<{ href: string; label: string }> }) {
  const pathname = usePathname() || "/";
  const navRef = useRef<HTMLElement>(null);
  const place = useRef<(() => void) | null>(null);
  const current = norm(pathname);
  // detail pages belong to the portfolio section
  const currentAttr = (href: string): "page" | "true" | undefined =>
    norm(href) === current ? "page" : current.includes("/companies/") && (href === "/" || href === "/ko/") ? "true" : undefined;

  useLayoutEffect(() => {
    const M = mk();
    if (!M || M.off() || !navRef.current) return;
    if (!place.current) place.current = M.indicator(navRef.current, "[aria-current]");
    else place.current();
    const p = place.current;
    document.fonts?.ready.then(() => p()).catch(() => {});
  }, [current]);

  return (
    <nav ref={navRef} aria-label="Main" className="vpd-nav order-3 flex w-full items-center gap-4 sm:order-none sm:w-auto sm:flex-1">
      {items.map((it) => (
        <Link key={it.href} href={it.href} className={LINK} aria-current={currentAttr(it.href)}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
