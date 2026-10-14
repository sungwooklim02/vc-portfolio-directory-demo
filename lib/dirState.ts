/**
 * Directory state <-> URL query. One state object drives the grid, the map, the charts, the hero orbit
 * and the language switch, so a filtered view survives "back", can be shared as a link, and keeps its
 * filters when the language changes. Defaults are omitted from the query; unknown values are ignored.
 */
export type SortKey = "default" | "name" | "founded";
export type ViewKey = "grid" | "map";

export interface DirState {
  q: string;
  sector: string; // "all" | sector id
  status: string; // "all" | status id
  sort: SortKey;
  view: ViewKey;
  city: string; // "all" | location id
  from: number | null; // founding year range (inclusive)
  to: number | null;
}

export const DEFAULT_STATE: DirState = {
  q: "",
  sector: "all",
  status: "all",
  sort: "default",
  view: "grid",
  city: "all",
  from: null,
  to: null,
};

export interface Vocab {
  sectors: string[];
  statuses: string[];
  cities: string[];
  years: [number, number];
}

const SORTS: SortKey[] = ["default", "name", "founded"];
const VIEWS: ViewKey[] = ["grid", "map"];

export function parseState(search: string, v: Vocab): DirState {
  const p = new URLSearchParams(search);
  const s: DirState = { ...DEFAULT_STATE };
  const q = p.get("q");
  if (q) s.q = q.slice(0, 80);
  const sector = p.get("sector");
  if (sector && v.sectors.includes(sector)) s.sector = sector;
  const status = p.get("status");
  if (status && v.statuses.includes(status)) s.status = status;
  const sort = p.get("sort") as SortKey | null;
  if (sort && SORTS.includes(sort)) s.sort = sort;
  const view = p.get("view") as ViewKey | null;
  if (view && VIEWS.includes(view)) s.view = view;
  const city = p.get("city");
  if (city && v.cities.includes(city)) s.city = city;
  const yr = (x: string | null) => {
    if (!x || !/^\d{4}$/.test(x)) return null;
    const n = Number(x);
    return n >= v.years[0] && n <= v.years[1] ? n : null;
  };
  s.from = yr(p.get("from"));
  s.to = yr(p.get("to"));
  if (s.from !== null && s.to !== null && s.from > s.to) [s.from, s.to] = [s.to, s.from];
  if (s.from === v.years[0]) s.from = null;
  if (s.to === v.years[1]) s.to = null;
  return s;
}

export function toQuery(s: DirState): string {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.sector !== "all") p.set("sector", s.sector);
  if (s.status !== "all") p.set("status", s.status);
  if (s.city !== "all") p.set("city", s.city);
  if (s.from !== null) p.set("from", String(s.from));
  if (s.to !== null) p.set("to", String(s.to));
  if (s.sort !== "default") p.set("sort", s.sort);
  if (s.view !== "grid") p.set("view", s.view);
  const str = p.toString();
  return str ? `?${str}` : "";
}

/** Number of narrowing conditions (search excluded) — the badge on the 360 "Filters" button. */
export function activeFilterCount(s: DirState): number {
  return (s.sector !== "all" ? 1 : 0) + (s.status !== "all" ? 1 : 0) + (s.city !== "all" ? 1 : 0) + (s.from !== null || s.to !== null ? 1 : 0);
}

export function isDefault(s: DirState): boolean {
  return !s.q.trim() && activeFilterCount(s) === 0;
}

/** sessionStorage key for the last directory query (detail page "back" link when history has no entry). */
export const LAST_QUERY_KEY = "vpd-dir-query";
