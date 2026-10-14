import raw from "@/data/companies.json";
import { hashString } from "./hash";
import type { Locale } from "./i18n";

export interface SectorDef {
  id: string;
  en: string;
  ko: string;
}
export type StatusId = "active" | "acquired" | "ipo";
export interface StatusDef {
  id: StatusId;
  en: string;
  ko: string;
}
export type RegionId = "asia" | "apac" | "europe" | "na";
export interface LocationDef {
  id: string;
  en: string;
  ko: string;
  region: RegionId;
  lat: number;
  lon: number;
}
export interface Company {
  slug: string;
  name: string;
  /** Hangul rendering of the name — searchable/displayed on KO pages. */
  koName: string;
  sector: string;
  status: StatusId;
  founded: number;
  teamSize: number;
  domain: string;
  featured: boolean;
  location: { id: string; en: string; ko: string };
  en: { oneLiner: string; body: string[] };
  ko: { oneLiner: string; body: string[] };
}

interface Dataset {
  sectors: SectorDef[];
  statuses: StatusDef[];
  locations: LocationDef[];
  companies: Company[];
}

const data = raw as unknown as Dataset;

export const sectors = data.sectors;
export const statuses = data.statuses;
export const locations = data.locations;
export const companies = data.companies;

export const stats = {
  companies: companies.length,
  sectors: sectors.length,
  exits: companies.filter((c) => c.status !== "active").length,
};

export function getCompany(slug: string): Company | undefined {
  return companies.find((c) => c.slug === slug);
}

export function sectorLabel(id: string, locale: Locale): string {
  const s = sectors.find((x) => x.id === id);
  return s ? s[locale] : id;
}

export function statusLabel(id: StatusId, locale: Locale): string {
  const s = statuses.find((x) => x.id === id);
  return s ? s[locale] : id;
}

/** "Berlin, Germany" -> "Berlin" · "독일 베를린" -> "베를린" (city-state names stay whole). */
export function cityShort(loc: { en: string; ko: string }, locale: Locale): string {
  if (locale === "en") return loc.en.split(",")[0].trim();
  const parts = loc.ko.trim().split(/\s+/);
  return parts[parts.length - 1];
}

export interface CityOption {
  id: string;
  label: string;
  full: string;
  region: RegionId;
  lat: number;
  lon: number;
}
/** City options for the directory/map, in dataset order, with locale labels. */
export function cityOptions(locale: Locale): CityOption[] {
  return locations.map((l) => ({ id: l.id, label: cityShort(l, locale), full: l[locale], region: l.region, lat: l.lat, lon: l.lon }));
}

/**
 * Up to `n` other companies in the same sector, chosen deterministically (FNV-1a distance), so a detail
 * page always offers the same "next" companies on every build.
 */
export function related(slug: string, n = 3): Company[] {
  const me = getCompany(slug);
  if (!me) return [];
  const h = hashString(slug);
  return companies
    .filter((c) => c.sector === me.sector && c.slug !== slug)
    .map((c) => ({ c, d: (hashString(c.slug) ^ h) >>> 0 }))
    .sort((a, b) => a.d - b.d || a.c.slug.localeCompare(b.c.slug))
    .slice(0, n)
    .map((x) => x.c);
}

/** Trimmed card payload — only what the client-side directory needs. */
export interface CardData {
  slug: string;
  name: string;
  /** Hangul name — present on KO locale only (search matching). */
  koName?: string;
  oneLiner: string;
  sector: string;
  status: StatusId;
  founded: number;
  /** location id (see `locations`) and its short locale label */
  cityId: string;
  city: string;
}
export function cardData(locale: Locale): CardData[] {
  return companies.map((c) => ({
    slug: c.slug,
    name: c.name,
    ...(locale === "ko" ? { koName: c.koName } : {}),
    oneLiner: c[locale].oneLiner,
    sector: c.sector,
    status: c.status,
    founded: c.founded,
    cityId: c.location.id,
    city: cityShort(c.location, locale),
  }));
}
