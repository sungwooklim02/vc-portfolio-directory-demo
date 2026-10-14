import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackToDirectory } from "@/components/BackToDirectory";
import { CoverPhoto } from "@/components/CoverPhoto";
import { StatusBadge } from "@/components/Directory";
import { ExternalLinkButton } from "@/components/ExternalLinkButton";
import { Icon, Icons, SectorIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { cityShort, companies, getCompany, related, sectorLabel, statusLabel } from "@/lib/companies";
import { t, type Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export function companyStaticParams(): Array<{ slug: string }> {
  return companies.map((c) => ({ slug: c.slug }));
}

export function companyMeta(locale: Locale, slug: string): Metadata {
  const c = getCompany(slug);
  if (!c) return {};
  return pageMeta(
    locale,
    `/companies/${c.slug}/`,
    `${c.name} — ${sectorLabel(c.sector, locale)}`,
    c[locale].oneLiner,
  );
}

export function CompanyView({ locale, slug }: { locale: Locale; slug: string }) {
  const c = getCompany(slug);
  if (!c) notFound();
  const s = t(locale);
  const copy = c[locale];
  const crossHref = locale === "en" ? `/ko/companies/${c.slug}/` : `/companies/${c.slug}/`;

  const facts: Array<{ label: string; icon: (typeof Icons)[keyof typeof Icons]; value: React.ReactNode }> = [
    { label: s.founded, icon: Icons.calendar, value: c.founded },
    { label: s.teamSize, icon: Icons.users, value: locale === "en" ? `~${c.teamSize}` : `약 ${c.teamSize}명` },
    { label: s.headquarters, icon: Icons.mapPin, value: c.location[locale] },
    { label: s.status, icon: Icons.badgeCheck, value: statusLabel(c.status, locale) },
    {
      label: s.website,
      icon: Icons.globe,
      value: <span className="font-mono text-[13px]">{c.domain}</span>,
    },
  ];
  const detailHref = (slug: string) => (locale === "en" ? `/companies/${slug}/` : `/ko/companies/${slug}/`);
  const more = related(c.slug, 3);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <BackToDirectory locale={locale} label={s.backToDirectory} />

      <header className="mt-5 flex items-start gap-4" data-mk-enter>
        <span className="vpd-detail-logo flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
          <Logo slug={c.slug} name={c.name} sector={c.sector} className="h-12 w-12" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{c.name}</h1>
            <StatusBadge status={c.status} label={statusLabel(c.status, locale)} />
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {locale === "ko" ? `${c.koName} · ` : ""}
            {sectorLabel(c.sector, locale)} · {c.location[locale]}
          </p>
        </div>
      </header>

      <p data-mk-enter className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">{copy.oneLiner}</p>

      <figure className="mt-6" data-mk-wipe>
        <CoverPhoto id={c.cover} locale={locale} className="h-44 w-full rounded-xl sm:h-56" />
        <figcaption className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">{s.coverCaption}</figcaption>
      </figure>

      <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_240px]">
        <div className="space-y-4 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {copy.body.map((para) => (
            <p key={para.slice(0, 32)} data-mk-reveal>{para}</p>
          ))}
        </div>
        <aside data-mk-reveal aria-label={s.factsLabel}>
          <dl className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  <Icon icon={f.icon} className="vpd-fact-ico" />
                  {f.label}
                </dt>
                <dd className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">{f.value}</dd>
              </div>
            ))}
            <div className="pt-1">
              <ExternalLinkButton locale={locale} />
            </div>
          </dl>
        </aside>
      </div>

      {more.length > 0 && (
        <section className="vpd-related" data-mk-reveal aria-labelledby="vpd-related-h">
          <h2 id="vpd-related-h" className="vpd-related-title">
            {s.relatedTitle}
          </h2>
          <ul className="vpd-related-list">
            {more.map((r) => (
              <li key={r.slug}>
                <Link href={detailHref(r.slug)} className="vpd-related-card">
                  <span className="vpd-related-logo">
                    <Logo slug={r.slug} name={r.name} sector={r.sector} className="h-7 w-7" />
                  </span>
                  <span className="min-w-0">
                    <span className="vpd-related-name">
                      {r.name}
                      {locale === "ko" ? ` ${r.koName}` : ""}
                    </span>
                    <span className="vpd-related-line">
                      <SectorIcon id={r.sector} className="vpd-fact-ico" />
                      {cityShort(r.location, locale)} · {statusLabel(r.status, locale)}
                    </span>
                  </span>
                  <Icon icon={Icons.arrowUpRight} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div data-mk-reveal className="mt-10 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <span className="text-zinc-500 dark:text-zinc-400">{s.crossLangHint} </span>
        <Link
          href={crossHref}
          className="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-100 dark:hover:decoration-zinc-100"
        >
          {s.crossLang}
        </Link>
      </div>
    </div>
  );
}
