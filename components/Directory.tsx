"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CardData, StatusId } from "@/lib/companies";
import { t, type Locale } from "@/lib/i18n";
import { mk } from "@/lib/mk";
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

type SortKey = "default" | "name" | "founded";

export function Directory({ locale, items, sectors, statuses }: Props) {
  const s = t(locale);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [sheetOpen, setSheetOpen] = useState(false);

  const ulRef = useRef<HTMLUListElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const searchRef = useRef<HTMLLabelElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const sectorGroupRef = useRef<HTMLDivElement>(null);
  const statusGroupRef = useRef<HTMLDivElement>(null);
  const placers = useRef<Array<() => void>>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((c) => {
      if (sector !== "all" && c.sector !== sector) return false;
      if (status !== "all" && c.status !== status) return false;
      // haystack includes the Hangul name rendering on the KO locale
      if (q && !`${c.name} ${c.koName ?? ""} ${c.oneLiner}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name, "en"));
    if (sort === "founded") return [...list].sort((a, b) => b.founded - a.founded);
    return list;
  }, [items, query, sector, status, sort]);
  const prevLen = useRef(filtered.length);

  /** Run a filter/sort state change with FLIP: cards glide to their new slots, new ones scale in. */
  const apply = (fn: () => void) => {
    const M = mk();
    if (!M || M.off()) {
      fn();
      return;
    }
    const ul = ulRef.current;
    if (ul) {
      M.flip(ul, () => flushSync(fn));
      return;
    }
    flushSync(fn);
    const next = ulRef.current;
    if (next) M.enter(Array.from(next.children).slice(0, 16), { y: 22, scale: 0.96, step: 35 });
  };

  // first mount: cards rise in as they scroll into view (hidden only when motion is on)
  useLayoutEffect(() => {
    const M = mk();
    const ul = ulRef.current;
    if (!M || !ul || M.off()) return;
    M.reveal(Array.from(ul.children), { y: 36 });
  }, []);

  // sliding pill behind the pressed chip (motion on only; static look otherwise unchanged)
  useLayoutEffect(() => {
    const M = mk();
    if (!M || M.off()) return;
    const groups = [sectorGroupRef.current, statusGroupRef.current].filter((g): g is HTMLDivElement => !!g);
    placers.current = groups.map((g) => {
      g.classList.add("has-ind");
      return M.indicator(g, ':scope > button[aria-pressed="true"]');
    });
    const replace = () => placers.current.forEach((f) => f());
    document.fonts?.ready.then(replace).catch(() => {});
    return () => {
      groups.forEach((g) => {
        g.classList.remove("has-ind");
        g.querySelector(":scope > .mk-indicator")?.remove();
      });
      placers.current = [];
    };
  }, []);
  useLayoutEffect(() => {
    placers.current.forEach((f) => f());
  }, [sector, status, sheetOpen]);

  // data motion: tell the hero orbit what is selected; pop the count; shake + pop on zero results
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("vpd:filter", { detail: { slugs: filtered.map((c) => c.slug), all: filtered.length === items.length } }),
    );
    const prev = prevLen.current;
    prevLen.current = filtered.length;
    const M = mk();
    if (!M || M.off() || prev === filtered.length) return;
    M.pop(countRef.current);
    if (prev > 0 && filtered.length === 0) {
      M.shake(searchRef.current);
      M.overlayIn(emptyRef.current, "pop");
    }
  }, [filtered, items.length]);

  // mobile filter sheet: open and close both animate; Esc, backdrop and "show results" close it
  const openSheet = () => {
    flushSync(() => setSheetOpen(true));
    mk()?.overlayIn(sheetRef.current, "sheet", backdropRef.current);
    sheetRef.current?.querySelector<HTMLElement>(".vpd-sheet-close")?.focus({ preventScroll: true });
  };
  const closeSheet = () => {
    const finish = () => {
      // overlayOut commits its end keyframe (translateY(100%)) inline; drop it so the
      // same element renders in place as the >=640px desktop chip bar.
      sheetRef.current?.style.removeProperty("transform");
      setSheetOpen(false);
      filterBtnRef.current?.focus({ preventScroll: true });
    };
    const M = mk();
    if (!M) {
      finish();
      return;
    }
    M.overlayOut(sheetRef.current, "sheet", finish, backdropRef.current);
  };
  useEffect(() => {
    if (!sheetOpen) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSheet();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const f = Array.from(sheetRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (!f.length) return;
      const firstEl = f[0];
      const lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 640px)");
    const onMq = () => {
      if (mq.matches) {
        sheetRef.current?.style.removeProperty("transform");
        setSheetOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    mq.addEventListener?.("change", onMq);
    return () => {
      html.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener?.("change", onMq);
    };
    // closeSheet only reads refs; re-binding per open is enough
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  const statusLabelOf = (id: string) => statuses.find((x) => x.id === id)?.label ?? id;
  const sectorLabelOf = (id: string) => sectors.find((x) => x.id === id)?.label ?? id;
  const detailPath = (slug: string) =>
    locale === "en" ? `/companies/${slug}/` : `/ko/companies/${slug}/`;
  const activeFilters = (sector !== "all" ? 1 : 0) + (status !== "all" ? 1 : 0);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
    }`;

  return (
    <section aria-label={s.directoryTitle}>
      {/* keeps heading order sequential (h1 hero -> h2 section -> h3 cards) */}
      <h2 className="sr-only">{s.directoryHeading}</h2>
      {/* filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label ref={searchRef} className="relative min-w-0 w-full flex-none sm:w-auto sm:flex-1 sm:max-w-sm">
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
              onChange={(e) => {
                const v = e.target.value;
                apply(() => setQuery(v));
              }}
              placeholder={s.searchPlaceholder}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{s.sortLabel}</span>
            <select
              value={sort}
              onChange={(e) => {
                const v = e.target.value as SortKey;
                apply(() => setSort(v));
              }}
              className="rounded-md border border-zinc-300 bg-white py-1.5 pl-2 pr-6 text-xs text-zinc-700 focus:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="default">{s.sortDefault}</option>
              <option value="name">{s.sortName}</option>
              <option value="founded">{s.sortFounded}</option>
            </select>
          </label>
          <p ref={countRef} className="vpd-count text-xs tabular-nums text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {locale === "en"
              ? `${s.showingPrefix} ${filtered.length} ${s.showingOf} ${items.length} ${s.showingSuffix}`
              : `${items.length}${s.showingOf} ${filtered.length}${s.showingSuffix}`}
          </p>
          {/* 360: chip rows move into a bottom sheet behind this button (hidden from 640px up) */}
          <button
            ref={filterBtnRef}
            type="button"
            className="vpd-filter-btn"
            aria-expanded={sheetOpen}
            aria-controls="vpd-filters"
            onClick={openSheet}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            {s.filtersButton}
            {activeFilters > 0 && <span className="vpd-filter-count">{activeFilters}</span>}
          </button>
        </div>
        {sheetOpen && <div ref={backdropRef} className="vpd-sheet-backdrop" aria-hidden="true" onClick={closeSheet} />}
        <div
          id="vpd-filters"
          ref={sheetRef}
          className={`vpd-filters flex flex-col gap-3${sheetOpen ? " is-open" : ""}`}
          {...(sheetOpen ? { role: "dialog", "aria-modal": true, "aria-label": s.filtersSheetTitle } : {})}
        >
          <div className="vpd-sheet-head">
            <span aria-hidden="true" className="vpd-sheet-grab" />
            <strong>{s.filtersSheetTitle}</strong>
            <button type="button" className="vpd-sheet-close" aria-label={s.filtersClose} onClick={closeSheet}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div ref={sectorGroupRef} className="vpd-chips flex flex-wrap items-center gap-1.5" role="group" aria-label={s.filterSector}>
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {s.filterSector}
            </span>
            <button type="button" className={chip(sector === "all")} onClick={() => apply(() => setSector("all"))} aria-pressed={sector === "all"}>
              {s.filterAll}
            </button>
            {sectors.map((x) => (
              <button key={x.id} type="button" className={chip(sector === x.id)} onClick={() => apply(() => setSector(sector === x.id ? "all" : x.id))} aria-pressed={sector === x.id}>
                {x.label}
              </button>
            ))}
          </div>
          <div ref={statusGroupRef} className="vpd-chips flex flex-wrap items-center gap-1.5" role="group" aria-label={s.filterStatus}>
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              {s.filterStatus}
            </span>
            <button type="button" className={chip(status === "all")} onClick={() => apply(() => setStatus("all"))} aria-pressed={status === "all"}>
              {s.filterAll}
            </button>
            {statuses.map((x) => (
              <button key={x.id} type="button" className={chip(status === x.id)} onClick={() => apply(() => setStatus(status === x.id ? "all" : x.id))} aria-pressed={status === x.id}>
                {x.label}
              </button>
            ))}
          </div>
          <button type="button" className="vpd-sheet-done" onClick={closeSheet}>
            {s.filtersShowResults} ({filtered.length})
          </button>
        </div>
      </div>

      {/* grid */}
      {filtered.length > 0 ? (
        <ul ref={ulRef} className="venture-grid mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <li key={c.slug} data-key={c.slug}>
              <Link
                href={detailPath(c.slug)}
                className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <span className="venture-arrow" aria-hidden="true">↗</span>
                <div className="flex items-center gap-3">
                  <span className="vpd-logo flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-50 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
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
        <div ref={emptyRef} className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5M8.5 11h5" />
          </svg>
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{s.emptyTitle}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.emptyHint}</p>
          <button
            type="button"
            onClick={() =>
              apply(() => {
                setQuery("");
                setSector("all");
                setStatus("all");
              })
            }
            className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {s.resetFilters}
          </button>
        </div>
      )}
    </section>
  );
}
