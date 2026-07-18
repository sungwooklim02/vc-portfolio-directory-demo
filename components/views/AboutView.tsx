import type { Metadata } from "next";
import { stats } from "@/lib/companies";
import { hashString } from "@/lib/hash";
import type { Locale } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export function aboutMeta(locale: Locale): Metadata {
  return pageMeta(
    locale,
    "/about/",
    locale === "en" ? "About" : "소개",
    locale === "en"
      ? "About Velmara Ventures — thesis, team, and history of a fictional early-stage firm created for this demo."
      : "벨마라 벤처스 소개 — 본 데모를 위해 만든 가상 초기 투자사의 철학·팀·연혁입니다.",
  );
}

/* --------------------------------------------------- fictional team data */
// All people are fictional characters (synthetic coined names, SVG initials only).
const TEAM = [
  {
    name: "Mira Valserin",
    koName: "미라 발세린",
    title: { en: "Managing Partner", ko: "매니징 파트너" },
    bio: {
      en: "Writes first checks in fintech and enterprise software. Spent a decade running payments infrastructure before moving to the investing side.",
      ko: "핀테크·엔터프라이즈 소프트웨어의 첫 수표를 씁니다. 투자로 옮기기 전 10년간 결제 인프라를 직접 운영했습니다.",
    },
  },
  {
    name: "Teo Marchen",
    koName: "테오 마르첸",
    title: { en: "Partner", ko: "파트너" },
    bio: {
      en: "Leads AI and data infrastructure. Former platform engineering lead who still reads the pull requests of portfolio teams (when invited).",
      ko: "AI·데이터 인프라를 담당합니다. 플랫폼 엔지니어링 리드 출신으로, 초대받으면 지금도 포트폴리오 팀의 PR을 읽습니다.",
    },
  },
  {
    name: "Suah Linderel",
    koName: "수아 린더렐",
    title: { en: "Partner", ko: "파트너" },
    bio: {
      en: "Covers healthcare and consumer. Started in clinical operations, which shows in a bias toward products that survive the front desk.",
      ko: "헬스케어·컨슈머를 담당합니다. 임상 운영에서 출발한 이력 덕에, 접수 데스크에서 살아남는 제품을 편애합니다.",
    },
  },
  {
    name: "Anik Verolst",
    koName: "아닉 베롤스트",
    title: { en: "Principal", ko: "프린시펄" },
    bio: {
      en: "Works with climate and deep tech teams from first prototype to first production order — the stretch where most hardware plans meet reality.",
      ko: "기후·딥테크 팀과 첫 프로토타입부터 첫 양산 수주까지 함께합니다 — 대부분의 하드웨어 계획이 현실과 만나는 구간입니다.",
    },
  },
  {
    name: "Rhea Ostrelin",
    koName: "레아 오스트렐린",
    title: { en: "Principal", ko: "프린시펄" },
    bio: {
      en: "Covers mobility and logistics. A dispatcher-turned-product-manager who evaluates software by what it does at 6 a.m. on a Monday.",
      ko: "모빌리티·물류를 담당합니다. 배차 담당자 출신 프로덕트 매니저로, 소프트웨어를 월요일 아침 6시의 동작으로 평가합니다.",
    },
  },
];

const AVATAR_PALETTE = [
  { bg: "#dde3ea", fg: "#3e5468" },
  { bg: "#dbe4dd", fg: "#3f6152" },
  { bg: "#e8dee6", fg: "#5f4460" },
  { bg: "#e9e2d0", fg: "#6b5d34" },
  { bg: "#eadedc", fg: "#6b4540" },
];

function InitialsAvatar({ name }: { name: string }) {
  const h = hashString(name);
  const p = AVATAR_PALETTE[h % AVATAR_PALETTE.length];
  const initials = name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={`${name} — fictional person, initials avatar`} className="h-12 w-12 shrink-0">
      <circle cx="24" cy="24" r="24" fill={p.bg} />
      <text
        x="50%"
        y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        fontSize="17"
        fill={p.fg}
      >
        {initials}
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------- copy */
const copy = {
  en: {
    title: "About Velmara Ventures",
    thesis: [
      "We back early teams building the infrastructure of everyday life — how money moves, how care is delivered, how goods find their way, how energy is used. First checks at seed, follow-through to Series B, and a deliberately unhurried portfolio pace: fewer companies, known deeply, supported through the operational grind between rounds.",
      "The thesis is unfashionably simple: durable companies sell to practitioners, not to slide decks. They win by being reliable in unglamorous places — a reconciliation run at midnight, a dispatch board at dawn, a clinic front desk at opening time. We look for teams who already respect that reality before anyone invests in them.",
      "Geography follows the work. We invest from Seoul and Singapore into teams across Asia, Europe, and North America, and we spend our time where the portfolio actually operates — which is rarely a conference stage.",
    ],
    factsTitle: "Firm facts",
    teamTitle: "Team",
    teamNote:
      "All team members are fictional characters created for this demo — synthetic names, SVG initials, no photographs.",
    historyTitle: "History",
    history: [
      { year: "2016", text: "Firm founded in Seoul; first close of Fund I." },
      { year: "2017", text: "First seven portfolio investments completed." },
      { year: "2019", text: "Singapore office opened to cover Southeast Asia." },
      { year: "2022", text: "Fund II closed; portfolio passes 50 companies." },
      { year: "2025", text: `Portfolio reaches ${stats.companies} companies across ${stats.sectors} sectors.` },
    ],
    officesTitle: "Offices",
    offices: [
      { city: "Seoul (HQ)", address: "16F, 27 Velmara-gil, Gangnam-gu, Seoul" },
      { city: "Singapore", address: "Level 12, 5 Quayreth Lane, Singapore" },
    ],
    officesNote:
      "Addresses are fictional. General inquiries are outside this demo's scope — no contact form is provided.",
    portfolioLabel: "companies",
    sectorsLabel: "sectors",
  },
  ko: {
    title: "벨마라 벤처스 소개",
    thesis: [
      "우리는 일상의 인프라를 만드는 초기 팀에 투자합니다 — 돈이 움직이는 방식, 돌봄이 전달되는 방식, 물건이 길을 찾는 방식, 에너지가 쓰이는 방식. 시드에서 첫 수표를 쓰고 시리즈 B까지 따라가며, 포트폴리오 속도는 의도적으로 서두르지 않습니다. 적은 수의 회사를 깊이 알고, 라운드 사이의 운영 실무를 함께 버텨 냅니다.",
      "철학은 유행과 거리가 있을 만큼 단순합니다. 오래가는 회사는 발표 자료가 아니라 실무자에게 팝니다. 자정의 정산 배치, 새벽의 배차 보드, 개원 시간의 접수 데스크처럼 화려하지 않은 자리에서 믿을 만한 것이 이기는 길이라고 봅니다. 우리는 투자받기 전부터 그 현실을 존중하는 팀을 찾습니다.",
      "지역은 일을 따라갑니다. 서울과 싱가포르에서 아시아·유럽·북미의 팀에 투자하며, 시간은 포트폴리오가 실제로 돌아가는 곳에 씁니다 — 그곳이 컨퍼런스 무대인 경우는 드뭅니다.",
    ],
    factsTitle: "펌 개요",
    teamTitle: "팀",
    teamNote: "팀 구성원은 모두 본 데모를 위해 만든 가상 인물입니다 — 합성 조어 이름과 SVG 이니셜만 사용하며 사진은 없습니다.",
    historyTitle: "연혁",
    history: [
      { year: "2016", text: "서울에서 창업, 1호 펀드 1차 클로징." },
      { year: "2017", text: "첫 7개 포트폴리오 투자 집행." },
      { year: "2019", text: "동남아 커버를 위해 싱가포르 오피스 개소." },
      { year: "2022", text: "2호 펀드 클로징, 포트폴리오 50개사 돌파." },
      { year: "2025", text: `포트폴리오 ${stats.companies}개사·${stats.sectors}개 섹터 도달.` },
    ],
    officesTitle: "오피스",
    offices: [
      { city: "서울 (본사)", address: "서울 강남구 벨마라길 27, 16층" },
      { city: "싱가포르", address: "퀘이레스 레인 5, 12층, 싱가포르" },
    ],
    officesNote: "주소는 가상입니다. 문의 접수는 데모 범위 밖이라 별도 양식을 두지 않았습니다.",
    portfolioLabel: "개사",
    sectorsLabel: "개 분야",
  },
};

const factRows = {
  en: [
    ["Founded", "2016"],
    ["Offices", "Seoul · Singapore"],
    ["Stage", "Seed – Series B"],
    ["First check", "US$0.5–5M"],
    ["Portfolio", ""],
    ["Sectors", ""],
  ],
  ko: [
    ["설립", "2016"],
    ["오피스", "서울 · 싱가포르"],
    ["투자 단계", "시드 – 시리즈 B"],
    ["첫 수표", "US$0.5–5M"],
    ["포트폴리오", ""],
    ["섹터", ""],
  ],
};

export function AboutView({ locale }: { locale: Locale }) {
  const c = copy[locale];
  const facts = factRows[locale].map(([label, value]) => {
    if (label === "Portfolio" || label === "포트폴리오")
      return [label, `${stats.companies} ${c.portfolioLabel}`] as const;
    if (label === "Sectors" || label === "섹터")
      return [label, `${stats.sectors}${locale === "ko" ? c.sectorsLabel : ` ${c.sectorsLabel}`}`] as const;
    return [label, value] as const;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-100">{c.title}</h1>
      <div className="mt-5 space-y-4">
        {c.thesis.map((para) => (
          <p key={para.slice(0, 32)} className="text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {para}
          </p>
        ))}
      </div>

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

      <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{c.teamTitle}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {TEAM.map((person) => (
          <li key={person.name} className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <InitialsAvatar name={person.name} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {locale === "ko" ? `${person.koName} (${person.name})` : person.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{person.title[locale]}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">{person.bio[locale]}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">{c.teamNote}</p>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{c.historyTitle}</h2>
      <ol className="mt-4">
        {c.history.map((item, i) => (
          <li key={item.year} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" aria-hidden="true" />
              {i < c.history.length - 1 && (
                <span className="my-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
              )}
            </div>
            <div className="pb-5">
              <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{item.year}</span>
              <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{c.officesTitle}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {c.offices.map((office) => (
          <div key={office.city} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{office.city}</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{office.address}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">{c.officesNote}</p>
    </div>
  );
}
