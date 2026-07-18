import type { Metadata } from "next";
import { stats } from "@/lib/companies";
import type { Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export function aboutMeta(locale: Locale): Metadata {
  return pageMeta(
    locale,
    "/about/",
    locale === "en" ? "About" : "소개",
    locale === "en"
      ? "About Velmara Ventures — a fictional early-stage firm created for this demo."
      : "벨마라 벤처스 소개 — 본 데모를 위해 만든 가상의 초기 투자사입니다.",
  );
}

const copy = {
  en: {
    title: "About Velmara Ventures",
    thesis:
      "We back early teams building the infrastructure of everyday life — how money moves, how care is delivered, how goods find their way, how energy is used. First checks at seed, follow-through to Series B, and a deliberately unhurried portfolio pace: fewer companies, known deeply, supported through the operational grind between rounds. Most of the problems we fund are ones our partners once lived inside.",
    factsTitle: "Firm facts",
    facts: [
      ["Founded", "2016"],
      ["Offices", "Seoul · Singapore"],
      ["Stage", "Seed – Series B"],
      ["First check", "US$0.5–5M"],
      ["Portfolio", ""],
      ["Sectors", ""],
    ],
    portfolioLabel: "companies",
    sectorsLabel: "sectors",
  },
  ko: {
    title: "벨마라 벤처스 소개",
    thesis:
      "우리는 일상의 인프라를 만드는 초기 팀에 투자합니다 — 돈이 움직이는 방식, 돌봄이 전달되는 방식, 물건이 길을 찾는 방식, 에너지가 쓰이는 방식. 시드에서 첫 수표를 쓰고 시리즈 B까지 따라가며, 포트폴리오 속도는 의도적으로 서두르지 않습니다. 적은 수의 회사를 깊이 알고, 라운드 사이의 운영 실무를 함께 버텨 냅니다. 우리가 투자하는 문제 대부분은 파트너들이 한때 그 안에서 살았던 문제입니다.",
    factsTitle: "펌 개요",
    facts: [
      ["설립", "2016"],
      ["오피스", "서울 · 싱가포르"],
      ["투자 단계", "시드 – 시리즈 B"],
      ["첫 수표", "US$0.5–5M"],
      ["포트폴리오", ""],
      ["섹터", ""],
    ],
    portfolioLabel: "개사",
    sectorsLabel: "개 분야",
  },
};

export function AboutView({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const facts = c.facts.map(([label, value]) => {
    if (label === "Portfolio" || label === "포트폴리오")
      return [label, `${stats.companies} ${c.portfolioLabel}`] as const;
    if (label === "Sectors" || label === "섹터")
      return [label, `${stats.sectors}${locale === "ko" ? c.sectorsLabel : ` ${c.sectorsLabel}`}`] as const;
    return [label, value] as const;
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">{c.title}</h1>
      <p className="mt-5 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{c.thesis}</p>
      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {c.factsTitle}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
