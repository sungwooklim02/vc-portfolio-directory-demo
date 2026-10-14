"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { CardData, CityOption, StatusId } from "@/lib/companies";
import { activeFilterCount, DEFAULT_STATE, LAST_QUERY_KEY, parseState, toQuery, type DirState, type SortKey, type ViewKey } from "@/lib/dirState";
import { t, type Locale } from "@/lib/i18n";
import { mk } from "@/lib/mk";
import { plainMatch, type SearchDoc } from "@/lib/search-core.mjs";
import { Highlight } from "./directory/Highlight";
import { SearchBox, type SearchHelp, type SearchOption } from "./directory/SearchBox";
import { ViewToggle } from "./directory/ViewToggle";
import { Icon, Icons, SectorIcon } from "./icons";
import { Logo } from "./Logo";

export interface TaxonomyItem {
  id: string;
  label: string;
}

/** Status badge — colours from the design tokens (app/globals.css), same in light and dark. */
export function StatusBadge({ status, label }: { status: StatusId; label: string }) {
  return <span className={`vpd-status vpd-status--${status}`}>{label}</span>;
}

// the map view (ECharts + local geodata) is its own chunk, fetched the first time the map is opened
const MapView = dynamic(() => import("./directory/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="vpd-map-skel" aria-hidden="true" />,
});

interface Props {
  locale: Locale;
  items: CardData[];
  sectors: TaxonomyItem[];
  statuses: TaxonomyItem[];
  cities: CityOption[];
}

type Marks = { name?: Array<[number, number]>; koName?: Array<[number, number]>; oneLiner?: Array<[number, number]> };
interface Engine {
  search: (q: string) => { slugs: string[]; marks: Record<string, Marks>; suggestion: SearchHelp | null } | null;
  josa?: (word: string) => string;
}
type Facet = "sector" | "status" | "city" | "years" | "query";

export function Directory({ locale, items, sectors, statuses, cities }: Props) {
  const s = t(locale);
  const [st, setSt] = useState<DirState>(DEFAULT_STATE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [engine, setEngine] = useState<Engine | null>(null);

  const ulRef = useRef<HTMLUListElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const sectorGroupRef = useRef<HTMLDivElement>(null);
  const statusGroupRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const placers = useRef<Array<() => void>>([]);
  const restored = useRef(false);
  const loading = useRef(false);

  const years = useMemo<[number, number]>(() => {
    const f = items.map((c) => c.founded);
    return [Math.min(...f), Math.max(...f)];
  }, [items]);
  const vocab = useMemo(
    () => ({ sectors: sectors.map((x) => x.id), statuses: statuses.map((x) => x.id), cities: cities.map((x) => x.id), years }),
    [sectors, statuses, cities, years],
  );
  const sectorLabelOf = useCallback((id: string) => sectors.find((x) => x.id === id)?.label ?? id, [sectors]);
  const statusLabelOf = (id: string) => statuses.find((x) => x.id === id)?.label ?? id;
  const cityOf = useCallback((id: string) => cities.find((x) => x.id === id), [cities]);
  const detailPath = (slug: string) => (locale === "en" ? `/companies/${slug}/` : `/ko/companies/${slug}/`);

  const docs = useMemo<SearchDoc[]>(
    () =>
      items.map((c) => ({
        slug: c.slug,
        name: c.name,
        ...(c.koName ? { koName: c.koName } : {}),
        oneLiner: c.oneLiner,
        sectorLabel: sectorLabelOf(c.sector),
        city: cityOf(c.cityId)?.full ?? c.city,
      })),
    [items, sectorLabelOf, cityOf],
  );

  /* ── search: plain substring until the libraries arrive (first focus), then fuzzy + Hangul-aware */
  const loadEngine = useCallback(() => {
    if (loading.current) return;
    loading.current = true;
    Promise.all([import("fuse.js/basic"), import("es-hangul")])
      .then(async ([fuse, hangul]) => {
        const core = await import("@/lib/search-core.mjs");
        const searcher = core.createSearcher(
          { Fuse: fuse.default, getChoseong: hangul.getChoseong, disassemble: hangul.disassemble, convertQwertyToHangul: hangul.convertQwertyToHangul },
          docs,
          locale,
        );
        setEngine({ search: searcher.search, josa: (w) => hangul.josa(w, "을/를") });
      })
      .catch(() => {
        loading.current = false; // offline / chunk error: the plain substring filter keeps working; retry on next focus
      });
  }, [docs, locale]);

  const query = useMemo(() => {
    const q = st.q.trim();
    if (!q) return null;
    if (engine) {
      const r = engine.search(q);
      if (r) return { set: new Set(r.slugs), order: new Map(r.slugs.map((x, i) => [x, i])), marks: r.marks, help: r.suggestion };
    }
    const set = new Set(docs.filter((d) => plainMatch(d, q)).map((d) => d.slug));
    return { set, order: null as Map<string, number> | null, marks: {} as Record<string, Marks>, help: null as SearchHelp | null };
  }, [st.q, engine, docs]);

  /* ── filtering: one predicate; a facet's own condition is skipped when counting that facet */
  const pass = useCallback(
    (c: CardData, skip?: Facet) => {
      if (skip !== "sector" && st.sector !== "all" && c.sector !== st.sector) return false;
      if (skip !== "status" && st.status !== "all" && c.status !== st.status) return false;
      if (skip !== "city" && st.city !== "all" && c.cityId !== st.city) return false;
      if (skip !== "years" && ((st.from !== null && c.founded < st.from) || (st.to !== null && c.founded > st.to))) return false;
      if (skip !== "query" && query && !query.set.has(c.slug)) return false;
      return true;
    },
    [st.sector, st.status, st.city, st.from, st.to, query],
  );

  const filtered = useMemo(() => {
    const list = items.filter((c) => pass(c));
    if (st.sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name, "en"));
    if (st.sort === "founded") return [...list].sort((a, b) => b.founded - a.founded);
    if (query?.order) {
      const o = query.order;
      return [...list].sort((a, b) => (o.get(a.slug) ?? 999) - (o.get(b.slug) ?? 999));
    }
    return list;
  }, [items, pass, st.sort, query]);

  const counts = useMemo(() => {
    const by = (facet: Facet, key: (c: CardData) => string) => {
      const m = new Map<string, number>();
      let all = 0;
      for (const c of items) {
        if (!pass(c, facet)) continue;
        all++;
        m.set(key(c), (m.get(key(c)) ?? 0) + 1);
      }
      return { all, m };
    };
    return {
      sector: by("sector", (c) => c.sector),
      status: by("status", (c) => c.status),
      city: by("city", (c) => c.cityId),
      year: by("years", (c) => String(c.founded)),
    };
  }, [items, pass]);

  const prevLen = useRef(filtered.length);

  /** Run a state change with FLIP: cards glide to their new slots, new ones scale in. */
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
  const update = (patch: Partial<DirState>) => apply(() => setSt((prev) => ({ ...prev, ...patch })));
  const clearAll = () => update({ q: "", sector: "all", status: "all", city: "all", from: null, to: null });

  /* ── URL state: restore before first paint, write back (debounced) on every change */
  useLayoutEffect(() => {
    const parsed = parseState(window.location.search, vocab);
    restored.current = true;
    if (toQuery(parsed) !== toQuery(DEFAULT_STATE)) setSt(parsed);
    // vocab is static for the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    const qs = toQuery(st);
    const write = () => {
      try {
        const url = window.location.pathname + qs + window.location.hash;
        if (url !== window.location.pathname + window.location.search + window.location.hash) window.history.replaceState(null, "", url);
      } catch {
        /* history rate limit (Safari) — the next change writes again */
      }
      try {
        sessionStorage.setItem(`${LAST_QUERY_KEY}-${locale}`, qs);
      } catch {
        /* storage blocked */
      }
      window.dispatchEvent(new CustomEvent("vpd:url", { detail: { search: qs } }));
    };
    const id = window.setTimeout(write, 250);
    return () => window.clearTimeout(id);
  }, [st, locale]);

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
  }, [st.sector, st.status, sheetOpen, counts]);

  // data motion: tell the hero orbit what is selected; pop the count; shake + pop on zero results
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("vpd:filter", {
        detail: { slugs: filtered.map((c) => c.slug), all: filtered.length === items.length, sector: st.sector },
      }),
    );
    const prev = prevLen.current;
    prevLen.current = filtered.length;
    const M = mk();
    if (!M || M.off() || prev === filtered.length) return;
    M.pop(countRef.current);
    if (prev > 0 && filtered.length === 0) {
      const box = searchRef.current;
      // the shake leaves an inline transform behind; clear it so the wrapper stops forming a stacking context
      // (the suggestion pop-up layered under the chips that follow it in the DOM)
      void Promise.resolve(M.shake(box)).finally(() => {
        if (box) box.style.transform = "";
      });
      M.overlayIn(emptyRef.current, "pop");
    }
  }, [filtered, items.length, st.sector]);

  // the hero legend asks for a sector through one event, so every view shares the same state
  useEffect(() => {
    const onPick = (e: Event) => {
      const d = (e as CustomEvent<{ sector?: string }>).detail;
      if (!d?.sector) return;
      const id = d.sector;
      apply(() => setSt((prev) => ({ ...prev, sector: prev.sector === id ? "all" : id })));
    };
    window.addEventListener("vpd:pick", onPick);
    return () => window.removeEventListener("vpd:pick", onPick);
    // apply reads refs only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3D/2D orbit -> list: hovering a dot in the hero marks its card (the other direction is "vpd:hover")
  useEffect(() => {
    let lit: Element | null = null;
    const onDot = (e: Event) => {
      const slug = (e as CustomEvent<{ slug: string | null }>).detail?.slug ?? null;
      lit?.classList.remove("is-linked");
      lit = slug ? (ulRef.current?.querySelector(`li[data-key="${CSS.escape(slug)}"]`) ?? null) : null;
      lit?.classList.add("is-linked");
    };
    window.addEventListener("vpd:dot", onDot);
    return () => {
      window.removeEventListener("vpd:dot", onDot);
      lit?.classList.remove("is-linked");
    };
  }, []);

  const hover = (detail: { slug?: string | null; sector?: string | null }) =>
    window.dispatchEvent(new CustomEvent("vpd:hover", { detail }));

  // view switch (grid <-> map) as a screen transition
  const setView = (view: ViewKey) => {
    const M = mk();
    const run = () => flushSync(() => setSt((prev) => ({ ...prev, view })));
    if (!M || M.off()) {
      run();
      return;
    }
    M.swap(run, () => viewRef.current, { dir: view === "map" ? 1 : -1 });
  };

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

  const nActive = activeFilterCount(st);
  const chip = (active: boolean, n: number) =>
    `vpd-chip rounded-full border px-3 py-1 text-xs font-medium transition-colors${n === 0 && !active ? " is-zero" : ""} ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
        : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
    }`;
  const num = (n: number) => <span className="vpd-chip-n">{n}</span>;

  const searchOptions: SearchOption[] = query
    ? filtered.slice(0, 6).map((c) => ({
        slug: c.slug,
        name: c.name,
        koName: c.koName,
        sector: c.sector,
        sectorLabel: sectorLabelOf(c.sector),
        city: c.city,
        marks: query.marks[c.slug],
      }))
    : [];
  // "did you mean" only when the search itself finds nothing (not when other filters empty the list)
  const help = query && query.set.size === 0 ? query.help : null;
  const helpLabel = help
    ? help.kind === "qwerty"
      ? locale === "ko"
        ? `${s.searchDidYouMeanPre} ‘${engine?.josa ? engine.josa(help.query) : help.query}’ ${s.searchDidYouMeanPost}`
        : `${s.searchDidYouMeanPre} “${help.query}”${s.searchDidYouMeanPost}`
      : `${s.searchClosest} ${help.label}`
    : "";

  const applied: Array<{ key: string; label: string; clear: () => void }> = [];
  if (st.q.trim()) applied.push({ key: "q", label: `“${st.q.trim()}”`, clear: () => update({ q: "" }) });
  if (st.sector !== "all") applied.push({ key: "sector", label: sectorLabelOf(st.sector), clear: () => update({ sector: "all" }) });
  if (st.status !== "all") applied.push({ key: "status", label: statusLabelOf(st.status), clear: () => update({ status: "all" }) });
  if (st.city !== "all") applied.push({ key: "city", label: `${s.filterCity} · ${cityOf(st.city)?.label ?? st.city}`, clear: () => update({ city: "all" }) });
  if (st.from !== null || st.to !== null)
    applied.push({ key: "years", label: `${s.filterYears} · ${st.from ?? years[0]}–${st.to ?? years[1]}`, clear: () => update({ from: null, to: null }) });

  return (
    <section aria-label={s.directoryTitle}>
      {/* keeps heading order sequential (h1 hero -> h2 section -> h3 cards) */}
      <h2 className="sr-only">{s.directoryHeading}</h2>
      {/* filter bar */}
      <div className="flex flex-col gap-3">
        <div className="vpd-toolbar flex flex-wrap items-center gap-3">
          <div ref={searchRef} className="vpd-sb-wrap relative min-w-0 w-full flex-none sm:w-auto sm:flex-1 sm:max-w-md">
            <SearchBox
              locale={locale}
              value={st.q}
              inputRef={inputRef}
              onFirstUse={loadEngine}
              onChange={(v) => apply(() => setSt((prev) => ({ ...prev, q: v })))}
              options={searchOptions}
              help={help}
              helpLabel={helpLabel}
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{s.sortLabel}</span>
            <select
              value={st.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className="rounded-md border border-zinc-300 bg-white py-1.5 pl-2 pr-6 text-xs text-zinc-700 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="default">{s.sortDefault}</option>
              <option value="name">{s.sortName}</option>
              <option value="founded">{s.sortFounded}</option>
            </select>
          </label>
          <ViewToggle locale={locale} view={st.view} onChange={setView} />
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
            <Icon icon={Icons.sliders} />
            {s.filtersButton}
            {nActive > 0 && <span className="vpd-filter-count">{nActive}</span>}
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
              <Icon icon={Icons.x} size={20} />
            </button>
          </div>
          <div ref={sectorGroupRef} className="vpd-chips flex flex-wrap items-center gap-1.5" role="group" aria-label={s.filterSector}>
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{s.filterSector}</span>
            <button type="button" className={chip(st.sector === "all", counts.sector.all)} onClick={() => update({ sector: "all" })} aria-pressed={st.sector === "all"}>
              {s.filterAll}
              {num(counts.sector.all)}
            </button>
            {sectors.map((x) => {
              const n = counts.sector.m.get(x.id) ?? 0;
              return (
                <button
                  key={x.id}
                  type="button"
                  className={chip(st.sector === x.id, n)}
                  onClick={() => update({ sector: st.sector === x.id ? "all" : x.id })}
                  aria-pressed={st.sector === x.id}
                  title={n === 0 ? s.zeroChip : undefined}
                  onPointerEnter={() => hover({ sector: x.id })}
                  onPointerLeave={() => hover({ sector: null })}
                >
                  <SectorIcon id={x.id} />
                  {x.label}
                  {num(n)}
                </button>
              );
            })}
          </div>
          <div ref={statusGroupRef} className="vpd-chips flex flex-wrap items-center gap-1.5" role="group" aria-label={s.filterStatus}>
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{s.filterStatus}</span>
            <button type="button" className={chip(st.status === "all", counts.status.all)} onClick={() => update({ status: "all" })} aria-pressed={st.status === "all"}>
              {s.filterAll}
              {num(counts.status.all)}
            </button>
            {statuses.map((x) => {
              const n = counts.status.m.get(x.id) ?? 0;
              return (
                <button
                  key={x.id}
                  type="button"
                  className={chip(st.status === x.id, n)}
                  onClick={() => update({ status: st.status === x.id ? "all" : x.id })}
                  aria-pressed={st.status === x.id}
                  title={n === 0 ? s.zeroChip : undefined}
                >
                  {x.label}
                  {num(n)}
                </button>
              );
            })}
          </div>
          <button type="button" className="vpd-sheet-done" onClick={closeSheet}>
            {s.filtersShowResults} ({filtered.length})
          </button>
        </div>
        {applied.length > 0 && (
          <div className="vpd-applied" role="group" aria-label={s.appliedLabel}>
            <span className="vpd-applied-label">{s.appliedLabel}</span>
            {applied.map((a) => (
              <button key={a.key} type="button" className="vpd-applied-chip" onClick={a.clear} aria-label={`${s.removeFilter}: ${a.label}`}>
                <span>{a.label}</span>
                <Icon icon={Icons.x} />
              </button>
            ))}
            <button type="button" className="vpd-applied-clear" onClick={clearAll}>
              <Icon icon={Icons.reset} />
              {s.clearAll}
            </button>
          </div>
        )}
      </div>

      <div ref={viewRef} className="vpd-view" data-view={st.view}>
        {st.view === "map" ? (
          <MapView
            locale={locale}
            filtered={filtered}
            sectors={sectors}
            cities={cities}
            state={st}
            years={years}
            cityCounts={counts.city.m}
            sectorCounts={counts.sector.m}
            yearCounts={counts.year.m}
            onCity={(city) => update({ city: st.city === city ? "all" : city })}
            onSector={(sector) => update({ sector: st.sector === sector ? "all" : sector })}
            onYears={(from, to) => setSt((prev) => ({ ...prev, from: from <= years[0] ? null : from, to: to >= years[1] ? null : to }))}
            onClear={clearAll}
          />
        ) : filtered.length > 0 ? (
          <ul ref={ulRef} className="venture-grid mt-5 grid gap-3">
            {filtered.map((c) => {
              const m = query?.marks[c.slug];
              return (
                <li key={c.slug} data-key={c.slug}>
                  <Link
                    href={detailPath(c.slug)}
                    onPointerEnter={() => hover({ slug: c.slug })}
                    onPointerLeave={() => hover({ slug: null })}
                    onFocus={() => hover({ slug: c.slug })}
                    onBlur={() => hover({ slug: null })}
                    className="group flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                  >
                    <span className="venture-arrow" aria-hidden="true">
                      <Icon icon={Icons.arrowUpRight} size={20} />
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="vpd-logo flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-50 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                        <Logo slug={c.slug} name={c.name} className="max-h-8 max-w-9" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-zinc-900 group-hover:underline dark:text-zinc-100">
                          <Highlight text={c.name} ranges={m?.name} />
                          {c.koName && m?.koName && (
                            <span className="vpd-card-ko">
                              {" "}
                              <Highlight text={c.koName} ranges={m.koName} />
                            </span>
                          )}
                        </h3>
                        <p className="vpd-card-meta truncate text-xs text-zinc-500 dark:text-zinc-400">
                          <SectorIcon id={c.sector} />
                          <span>{sectorLabelOf(c.sector)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{c.city}</span>
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 flex-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                      <Highlight text={c.oneLiner} ranges={m?.oneLiner} />
                    </p>
                    <div className="mt-3">
                      <StatusBadge status={c.status} label={statusLabelOf(c.status)} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div ref={emptyRef} className="vpd-empty mt-10 flex flex-col items-center rounded-xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
            <Icon icon={Icons.search} size={20} className="vpd-empty-icon" />
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{s.emptyTitle}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{s.emptyHint}</p>
            {help && (
              <button type="button" className="vpd-empty-help" onClick={() => update({ q: help.kind === "qwerty" ? help.query : help.label })}>
                {helpLabel}
              </button>
            )}
            <button
              type="button"
              onClick={clearAll}
              className="mt-4 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {s.resetFilters}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
