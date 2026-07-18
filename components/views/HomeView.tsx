import type { Metadata } from "next";
import { Directory } from "@/components/Directory";
import { cardData, sectors, statuses, stats } from "@/lib/companies";
import { t, type Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export function homeMeta(locale: Locale): Metadata {
  return pageMeta(
    locale,
    "/",
    locale === "en"
      ? "Velmara Ventures — [DEMO] VC Portfolio Directory"
      : "벨마라 벤처스 — [데모] VC 포트폴리오 디렉토리",
    locale === "en"
      ? `A fictional VC portfolio directory demo: ${stats.companies} companies with sector and status filters, instant search, and full English/Korean pages.`
      : `가상 VC 포트폴리오 디렉토리 데모 — ${stats.companies}개사 그리드, 섹터·상태 필터, 즉시 검색, 영문/국문 페이지.`,
  );
}

export function HomeView({ locale }: { locale: Locale }) {
  const s = t(locale);
  const tiles = [
    { value: stats.companies, label: s.statCompanies },
    { value: stats.sectors, label: s.statSectors },
    { value: stats.exits, label: s.statExits },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* compact hero — badge, one-line declaration, stat tiles; grid starts in first viewport */}
      <section className="pb-6 pt-8 sm:pt-10">
        <p
          data-demo-badge
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-700 dark:border-amber-500/40 dark:bg-amber-950 dark:text-amber-400"
        >
          <span aria-hidden="true">●</span>
          {s.heroBadge}
        </p>
        <h1 className="mt-3 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">
          {s.heroLine}
        </h1>
        <dl className="mt-5 grid max-w-xl grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <dd className="text-xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
                {tile.value}
              </dd>
              <dt className="mt-0.5 text-[11px] leading-tight text-zinc-500 dark:text-zinc-400">{tile.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="pb-16">
        <Directory
          locale={locale}
          items={cardData(locale)}
          sectors={sectors.map((x) => ({ id: x.id, label: x[locale] }))}
          statuses={statuses.map((x) => ({ id: x.id, label: x[locale] }))}
        />
      </div>
    </div>
  );
}
