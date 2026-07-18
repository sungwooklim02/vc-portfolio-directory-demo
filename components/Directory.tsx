"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CardData, StatusId } from "@/lib/companies";
import { t, type Locale } from "@/lib/i18n";
import { Logo } from "./Logo";

export interface TaxonomyItem {
  id: string;
  label: string;
}

const STATUS_BADGE: Record<StatusId, string> = {
  active:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-400/20",
  acquired:
    "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-950 dark:text-indigo-300 dark:ring-indigo-400/20",
  ipo: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/25 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-400/20",
};

export function StatusBadge({ status, label }: { status: StatusId; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[status]}`}>
      {label}
    </span>
  );
}

interface Props {
  locale: Locale;
  items: CardData[];
  sectors: TaxonomyItem[];
  statuses: TaxonomyItem[];
}

export function Directory({ locale, items, sectors, statuses }: Props) {
  const s = t(locale);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((c) => {
      if (sector !== "all" && c.sector !== sector) return false;
      if (status !== "all" && c.status !== status) return false;
      if (q && !`${c.name} ${c.oneLiner}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, query, sector, status]);

  const statusLabelOf = (id: string) => statuses.find((x) => x.id === id)?.label ?? id;
  const sectorLabelOf = (id: string) => sectors.find((x) => x.id === id)?.label ?? id;
  const detailPath = (slug: string) =>
    locale === "en" ? `/companies/${slug}/` : `/ko/companies/${slug}/`;

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
    }`;

  return (
    <section aria-label={s.directoryTitle}>
      {/* filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1 sm:max-w-sm">
            <span className="sr-only">{s.searchLabel}</span>
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={s.searchPlaceholder}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </label>
          <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {locale === "en"
              ? `${s.showingPrefix} ${filtered.length} ${s.showingOf} ${items.length} ${s.showingSuffix}`
              : `${items.length}${s.showingOf} ${filtered.length}${s.showingSuffix}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={s.filterSector}>
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {s.filterSector}
          </span>
          <button type="button" className={chip(sector === "all")} onClick={() => setSector("all")} aria-pressed={sector === "all"}>
            {s.filterAll}
          </button>
          {sectors.map((x) => (
            <button key={x.id} type="button" className={chip(sector === x.id)} onClick={() => setSector(sector === x.id ? "all" : x.id)} aria-pressed={sector === x.id}>
              {x.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={s.filterStatus}>
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {s.filterStatus}
          </span>
          <button type="button" className={chip(status === "all")} onClick={() => setStatus("all")} aria-pressed={status === "all"}>
            {s.filterAll}
          </button>
          {statuses.map((x) => (
            <button key={x.id} type="button" className={chip(status === x.id)} onClick={() => setStatus(status === x.id ? "all" : x.id)} aria-pressed={status === x.id}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* grid */}
      {filtered.length > 0 ? (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <li key={c.slug}>
              <Link
                href={detailPath(c.slug)}
                className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-50 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                    <Logo slug={c.slug} name={c.name} className="max-h-8 max-w-9" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-zinc-900 group-hover:underline dark:text-zinc-100">
                      {c.name}
                    </h3>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{sectorLabelOf(c.sector)}</p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {c.oneLiner}
                </p>
                <div className="mt-3">
                  <StatusBadge status={c.status} label={statusLabelOf(c.status)} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M8.5 11h5" />
          </svg>
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{s.emptyTitle}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.emptyHint}</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSector("all");
              setStatus("all");
            }}
            className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {s.resetFilters}
          </button>
        </div>
      )}
    </section>
  );
}
