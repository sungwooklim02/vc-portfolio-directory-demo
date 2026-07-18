import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";
import { REPO_URL } from "@/lib/site";

export function demoNotesMeta(locale: Locale): Metadata {
  return pageMeta(
    locale,
    "/demo/",
    locale === "en" ? "About this demo" : "데모 안내",
    locale === "en"
      ? "What this demo is, three deliberate design points, and what is intentionally out of scope."
      : "이 데모의 범위, 의도된 설계 포인트 3가지, 그리고 일부러 범위 밖에 둔 것들.",
  );
}

const copy = {
  en: {
    title: "About this demo",
    intro:
      "This site is a self-built demo, not a client deliverable. It exists to demonstrate, with a working artifact, one specific slice: a bilingual (English-main / Korean) portfolio directory — 80 companies, grid, instant search, sector/status filters, and detail pages — built as a fully static site. Every company, brand, logo, and figure is fictional.",
    pointsTitle: "Three deliberate design points",
    points: [
      {
        title: "Single-source batch seeding",
        body: "All 160 detail pages (80 companies × 2 languages) are generated at build time from one data file. There is no hand-edited page. In a real build, the same batch-seeding approach prevents an empty grid on launch day: the operator seeds all companies first, then opens per-company editing.",
      },
      {
        title: "Logo normalization",
        body: "The generated logos intentionally vary in aspect ratio — square, wide, tall. The card frame absorbs the differences into a uniform grid. In a real build, this is the difference between a directory that looks curated and one that looks pasted together, because real companies never deliver logos in one format.",
      },
      {
        title: "Both-languages-complete seeding",
        body: "This demo seeds English and Korean content at 100% for every company. Real content collection will not look like this: some companies won't provide English text. That case needs an explicit policy — hold the company from the English site, or fall back to Korean — and it is a planning decision, not a technical detail.",
      },
    ],
    scopeTitle: "Intentionally out of scope",
    scope: [
      "Admin CMS, account issuance, and login of any kind — this demo is the visitor-facing screen only, and no such UI appears anywhere.",
      "Approval/review workflow for submitted content.",
      "Automatic locale redirect (kept to the standard explicit-path i18n so every URL is verifiable).",
      "Real external links — company websites are fictional, so the button shows a demo notice instead of navigating.",
      "Any backend: the site is a static export with zero server code.",
    ],
    verifyTitle: "Verify it yourself",
    verify:
      "The full source, the data generator, and the performance measurement method (multi-region TTFB) are public:",
    verifyLink: "Source & measurement notes on GitHub",
  },
  ko: {
    title: "데모 안내",
    intro:
      "이 사이트는 자체 제작한 데모이며, 클라이언트 납품물이 아닙니다. '영문 메인 + 국문'의 이중 언어 포트폴리오 디렉토리 — 80개사 그리드, 즉시 검색, 섹터·상태 필터, 상세 페이지 — 를 완전 정적 사이트로 만들면 어떤 모습인지, 서술이 아닌 실물로 보여 주기 위해 존재합니다. 등장하는 모든 기업·브랜드·로고·수치는 가상입니다.",
    pointsTitle: "의도된 설계 포인트 3가지",
    points: [
      {
        title: "단일 소스 일괄 시딩",
        body: "상세 페이지 160장(80개사 × 2개 언어)은 전부 하나의 데이터 파일에서 빌드 시 일괄 생성됩니다. 손으로 고친 페이지는 한 장도 없습니다. 실제 구축에서도 같은 방식의 일괄 시딩이 오픈일의 '빈 그리드'를 막습니다 — 운영자가 전체를 먼저 시딩하고, 그 뒤에 기업별 수정을 개방하는 순서입니다.",
      },
      {
        title: "로고 정규화",
        body: "생성된 로고들은 일부러 비율이 제각각입니다 — 정사각, 가로형, 세로형. 카드 프레임이 그 차이를 흡수해 균일한 그리드를 유지합니다. 실제 기업들이 로고를 한 가지 규격으로 주는 일은 없기 때문에, 이 처리가 '정돈된 디렉토리'와 '붙여 넣은 디렉토리'를 가릅니다.",
      },
      {
        title: "양 언어 완비 시딩",
        body: "이 데모는 모든 기업의 영문·국문 콘텐츠를 100% 채워 시딩했습니다. 실제 수집은 이렇게 흘러가지 않습니다 — 영문 소개를 주지 않는 기업이 반드시 나옵니다. 그 경우를 위한 명시적 정책(영문 사이트에서 노출 보류 또는 국문 대체 표기)이 별도로 필요하며, 이것은 기술 문제가 아니라 기획 결정입니다.",
      },
    ],
    scopeTitle: "일부러 범위 밖에 둔 것",
    scope: [
      "관리자 CMS·계정 발급·로그인 일체 — 이 데모는 방문자 화면만 다루며, 그런 UI는 어디에도 두지 않았습니다.",
      "등록 콘텐츠의 승인·검수 워크플로.",
      "언어 자동 리다이렉트(모든 URL을 검증 가능하게 유지하려고 표준 명시 경로 i18n만 사용).",
      "실제 외부 링크 — 기업 웹사이트가 가상이므로, 버튼은 이동 대신 데모 안내를 표시합니다.",
      "백엔드 일체 — 이 사이트는 서버 코드 0줄의 정적 export입니다.",
    ],
    verifyTitle: "직접 검증하기",
    verify: "전체 소스, 데이터 생성기, 다중 리전 TTFB 측정 방법이 공개되어 있습니다:",
    verifyLink: "GitHub에서 소스·측정 노트 보기",
  },
};

export function DemoNotesView({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">{c.title}</h1>
      <p className="mt-5 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{c.intro}</p>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{c.pointsTitle}</h2>
      <ol className="mt-4 space-y-4">
        {c.points.map((point, i) => (
          <li key={point.title} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="flex items-baseline gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="text-zinc-400 dark:text-zinc-500">{i + 1}.</span>
              {point.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{point.body}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{c.scopeTitle}</h2>
      <ul className="mt-4 space-y-2">
        {c.scope.map((item) => (
          <li key={item.slice(0, 24)} className="flex gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <span aria-hidden="true" className="mt-0.5 text-zinc-400 dark:text-zinc-600">—</span>
            {item}
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{c.verifyTitle}</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{c.verify}</p>
      <p className="mt-2">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:text-zinc-100 dark:hover:decoration-zinc-100"
        >
          {c.verifyLink}
        </a>
      </p>
    </div>
  );
}
