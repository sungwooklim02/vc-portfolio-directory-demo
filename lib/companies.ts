import raw from "@/data/companies.json";
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
  location: { en: string; ko: string };
  en: { oneLiner: string; body: string[] };
  ko: { oneLiner: string; body: string[] };
}

interface Dataset {
  sectors: SectorDef[];
  statuses: StatusDef[];
  companies: Company[];
}

const data = raw as unknown as Dataset;

export const sectors = data.sectors;
export const statuses = data.statuses;
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
  }));
}
