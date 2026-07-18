/**
 * gen-companies.mjs — deterministic generator for the fictional dataset.
 *
 * Writes data/companies.json: 80 companies x EN/KO (8 sectors x 10).
 * Every company, brand, and figure is fictional; names are synthetic coinages
 * curated to avoid collision with real companies or investors.
 * Deterministic: same input -> same output (FNV-1a seeded).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "companies.json");

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ---------------------------------------------------------------- sectors */
const SECTORS = [
  {
    id: "fintech", en: "Fintech", ko: "핀테크",
    focusEn: "the unglamorous plumbing of money movement",
    focusKo: "돈이 오가는 길목의 보이지 않는 배관을 정비하는 일",
  },
  {
    id: "saas", en: "Enterprise SaaS", ko: "엔터프라이즈 SaaS",
    focusEn: "workflows that teams actually run every week",
    focusKo: "팀이 실제로 매주 굴리는 워크플로",
  },
  {
    id: "ai", en: "AI & Data", ko: "AI·데이터",
    focusEn: "the operational layer of machine learning",
    focusKo: "머신러닝의 운영 계층",
  },
  {
    id: "health", en: "Healthcare & Bio", ko: "헬스케어·바이오",
    focusEn: "software that respects clinical reality",
    focusKo: "임상 현장의 현실을 존중하는 소프트웨어",
  },
  {
    id: "consumer", en: "Consumer", ko: "컨슈머",
    focusEn: "products people invite into their daily routines",
    focusKo: "일상 루틴에 자연스럽게 스며드는 제품",
  },
  {
    id: "climate", en: "Climate & Energy", ko: "기후·에너지",
    focusEn: "measurable, deployable decarbonization",
    focusKo: "측정 가능하고 실제 배치 가능한 탈탄소",
  },
  {
    id: "logistics", en: "Mobility & Logistics", ko: "모빌리티·물류",
    focusEn: "the coordination problems of the physical world",
    focusKo: "물리 세계의 조율 문제",
  },
  {
    id: "deeptech", en: "Deep Tech", ko: "딥테크",
    focusEn: "hardware problems most teams avoid",
    focusKo: "대부분의 팀이 피해 가는 하드웨어 난제",
  },
];

const STATUSES = [
  { id: "active", en: "Active", ko: "운영 중" },
  { id: "acquired", en: "Acquired", ko: "피인수" },
  { id: "ipo", en: "IPO", ko: "상장" },
];

/* -------------------------------------------------------------- locations */
const LOCATIONS = [
  { en: "Seoul, South Korea", ko: "대한민국 서울", region: "asia" },
  { en: "Busan, South Korea", ko: "대한민국 부산", region: "asia" },
  { en: "Tokyo, Japan", ko: "일본 도쿄", region: "asia" },
  { en: "Singapore", ko: "싱가포르", region: "asia" },
  { en: "Taipei, Taiwan", ko: "대만 타이베이", region: "asia" },
  { en: "Sydney, Australia", ko: "호주 시드니", region: "apac" },
  { en: "Berlin, Germany", ko: "독일 베를린", region: "europe" },
  { en: "London, United Kingdom", ko: "영국 런던", region: "europe" },
  { en: "Amsterdam, Netherlands", ko: "네덜란드 암스테르담", region: "europe" },
  { en: "Rotterdam, Netherlands", ko: "네덜란드 로테르담", region: "europe" },
  { en: "Helsinki, Finland", ko: "핀란드 헬싱키", region: "europe" },
  { en: "Stockholm, Sweden", ko: "스웨덴 스톡홀름", region: "europe" },
  { en: "Toronto, Canada", ko: "캐나다 토론토", region: "na" },
  { en: "New York, USA", ko: "미국 뉴욕", region: "na" },
  { en: "San Francisco, USA", ko: "미국 샌프란시스코", region: "na" },
  { en: "Boston, USA", ko: "미국 보스턴", region: "na" },
  { en: "Austin, USA", ko: "미국 오스틴", region: "na" },
];

const REGION_PHRASE = {
  asia: { en: "East and Southeast Asia", ko: "동아시아·동남아" },
  apac: { en: "the Asia-Pacific region", ko: "아시아·태평양 지역" },
  europe: { en: "Europe", ko: "유럽" },
  na: { en: "North America", ko: "북미" },
};

/* ------------------------------------------- companies (synthetic names) */
// [name, oneLinerEn, oneLinerKo] — 10 per sector, index-aligned.
const COMPANIES = {
  fintech: [
    ["Ledgerine", "Automated close and consolidation for multi-entity finance teams.", "다법인 재무팀을 위한 결산·연결 자동화 플랫폼."],
    ["Payvorn", "Cross-border payout rails for marketplaces and creator platforms.", "마켓플레이스·크리에이터 플랫폼을 위한 국경 간 정산 인프라."],
    ["Finomere", "Cash-flow forecasting built for seasonal small businesses.", "계절성 소상공인에 맞춘 현금흐름 예측 서비스."],
    ["Trestapay", "One-tap recurring billing for subscription-first commerce.", "구독형 커머스를 위한 원탭 반복 결제 솔루션."],
    ["Vaultrine", "Treasury dashboards that unify bank, card, and wallet balances.", "은행·카드·월렛 잔액을 한 화면에 모으는 트레저리 대시보드."],
    ["Credorna", "Credit scoring from operational data for thin-file merchants.", "금융 이력이 얇은 사업자를 위한 운영 데이터 기반 신용평가."],
    ["Remitello", "Payroll and remittance for distributed teams in twelve currencies.", "12개 통화를 지원하는 분산 팀 급여·송금 서비스."],
    ["Bursella", "Expense cards with policy checks that run before the swipe.", "결제 전에 정책을 검사하는 법인 경비 카드."],
    ["Yieldarn", "Idle-cash allocation tools for startup treasuries.", "스타트업 유휴 자금 운용을 돕는 트레저리 도구."],
    ["Monvarra", "Reconciliation engine that matches invoices to payments overnight.", "송장과 입금을 야간 일괄 대사하는 정산 엔진."],
  ],
  saas: [
    ["Opslune", "Runbook automation that turns incident response into checklists.", "장애 대응을 체크리스트로 바꾸는 런북 자동화 도구."],
    ["Taskovia", "Cross-team task orchestration with dependency-aware scheduling.", "의존성을 인식하는 팀 간 업무 오케스트레이션."],
    ["Quorvane", "Board and committee workflows for mid-market companies.", "중견기업을 위한 이사회·위원회 워크플로 관리."],
    ["Formyra", "Form pipelines that route submissions into existing systems.", "제출 데이터를 기존 시스템으로 라우팅하는 폼 파이프라인."],
    ["Docurella", "Contract lifecycle management with clause-level tracking.", "조항 단위 추적이 가능한 계약 수명주기 관리."],
    ["Meetrino", "Meeting notes that assign owners and follow up automatically.", "담당자 지정과 후속 알림까지 자동화한 회의록 서비스."],
    ["Planovae", "Headcount and budget planning in one shared model.", "인력·예산 계획을 하나의 모델로 통합하는 플래닝 툴."],
    ["Deskarna", "Internal helpdesk that deflects tickets with living FAQs.", "살아있는 FAQ로 티켓을 줄이는 사내 헬프데스크."],
    ["Flowbern", "No-code approval flows for procurement and finance.", "구매·재무 결재를 노코드로 설계하는 승인 플로."],
    ["Stagerly", "Release management for teams shipping weekly.", "주 단위 배포 팀을 위한 릴리스 관리 도구."],
  ],
  ai: [
    ["Modelyn", "Evaluation infrastructure for teams shipping ML in production.", "프로덕션 ML 팀을 위한 평가 인프라."],
    ["Vectorna", "Vector search that stays fast past a billion embeddings.", "10억 임베딩 규모에서도 빠른 벡터 검색 엔진."],
    ["Inferrix", "Inference cost optimization across GPU fleets.", "GPU 클러스터의 추론 비용 최적화 플랫폼."],
    ["Tensorel", "Feature stores with lineage you can actually audit.", "감사 가능한 계보를 갖춘 피처 스토어."],
    ["Datyrra", "Data quality monitors that catch schema drift early.", "스키마 드리프트를 조기에 잡는 데이터 품질 모니터링."],
    ["Corveil", "Privacy-preserving analytics for regulated industries.", "규제 산업을 위한 프라이버시 보존 분석."],
    ["Annotara", "Managed labeling workflows with reviewer consensus built in.", "검수자 합의 절차를 내장한 데이터 라벨링 워크플로."],
    ["Queryna", "Natural-language querying over governed warehouses.", "거버넌스가 적용된 웨어하우스 대상 자연어 질의."],
    ["Embedra", "Document understanding APIs for long, messy PDFs.", "길고 지저분한 PDF를 이해하는 문서 처리 API."],
    ["Synthemis", "Synthetic tabular data for safer model development.", "안전한 모델 개발을 위한 합성 테이블 데이터."],
  ],
  health: [
    ["Medrovia", "Clinic operations platform covering intake to follow-up.", "접수부터 사후 관리까지 아우르는 클리닉 운영 플랫폼."],
    ["Curalyn", "Care-plan adherence tools for chronic condition programs.", "만성질환 프로그램의 치료 계획 이행을 돕는 도구."],
    ["Genotrella", "Genomic report interpretation for community hospitals.", "지역 병원을 위한 유전체 리포트 해석 서비스."],
    ["Vitarnelle", "Remote vitals monitoring with clinician-grade alerts.", "임상 수준 알림을 갖춘 원격 생체신호 모니터링."],
    ["Somnovia", "Digital sleep therapy programs prescribed by clinics.", "클리닉이 처방하는 디지털 수면 치료 프로그램."],
    ["Nurvatek", "Scheduling and acuity tools for nursing teams.", "간호 인력 배치·중증도 관리 도구."],
    ["Wellstrome", "Employer wellness benefits with measurable outcomes.", "성과를 측정할 수 있는 기업 웰니스 복지 플랫폼."],
    ["Rehalyn", "Home rehabilitation coaching with motion tracking.", "동작 인식을 활용한 재택 재활 코칭."],
    ["Dosierra", "Medication adherence packaging with smart reminders.", "스마트 알림을 결합한 복약 순응 패키징."],
    ["Panomedra", "Imaging workflow software for outpatient radiology.", "외래 영상의학을 위한 영상 워크플로 소프트웨어."],
  ],
  consumer: [
    ["Snackerly", "Regional snack subscriptions sourced from independent makers.", "독립 생산자의 지역 간식을 모은 구독 서비스."],
    ["Wardovia", "Capsule wardrobe planning with resale built in.", "리세일 기능을 내장한 캡슐 옷장 플래너."],
    ["Playmerra", "Co-op puzzle games for families across devices.", "가족이 기기 상관없이 함께 즐기는 협동 퍼즐 게임."],
    ["Tastelyn", "Home-cook recipe boxes with local seasonal produce.", "지역 제철 식재료로 구성한 레시피 박스."],
    ["Roomverra", "Furniture try-before-you-buy with AR previews.", "AR 미리보기로 가구를 먼저 배치해 보는 서비스."],
    ["Petarno", "Preventive pet care plans with tele-vet check-ins.", "원격 수의 상담을 포함한 반려동물 예방 케어 플랜."],
    ["Fandelle", "Membership tools for independent creators and their fans.", "독립 크리에이터와 팬을 잇는 멤버십 도구."],
    ["Grocevia", "Neighborhood group-buying for weekly groceries.", "동네 단위 장보기 공동구매 플랫폼."],
    ["Trippara", "Slow-travel itineraries built around rail routes.", "철도 노선 중심의 슬로 트래블 일정 서비스."],
    ["Souvenelle", "Personalized gift curation from local workshops.", "지역 공방과 연결한 맞춤 선물 큐레이션."],
  ],
  climate: [
    ["Voltarna", "Battery analytics that extend fleet and storage lifespan.", "배터리 플릿의 수명을 늘리는 운영 분석 플랫폼."],
    ["Sunverra", "Rooftop solar design and permitting automation.", "지붕형 태양광 설계·인허가 자동화."],
    ["Gridelle", "Demand-response orchestration for commercial buildings.", "상업 건물 수요반응(DR) 오케스트레이션."],
    ["Emberlyn", "Wildfire risk mapping for utilities and insurers.", "전력사·보험사를 위한 산불 리스크 매핑."],
    ["Thermovia", "Industrial heat-pump retrofits as a service.", "산업용 히트펌프 전환 구독 서비스."],
    ["Aeolyra", "Small-wind site assessment with acoustic modeling.", "소형 풍력 입지 평가·소음 모델링."],
    ["Hydrenna", "Leak detection for aging municipal water networks.", "노후 상수도망 누수 감지 솔루션."],
    ["Circulyn", "Reverse logistics for electronics reuse and refurbishing.", "전자기기 재사용·리퍼비시 역물류 플랫폼."],
    ["Fluxella", "Real-time carbon accounting wired into ERP data.", "ERP 데이터와 연동되는 실시간 탄소 회계."],
    ["Kelverra", "Kelp-based packaging materials for food brands.", "식품 브랜드를 위한 해조류 기반 포장재."],
  ],
  logistics: [
    ["Fleetara", "Mid-mile fleet orchestration for regional carriers.", "지역 운송사를 위한 미드마일 차량 오케스트레이션."],
    ["Cargolyn", "Digital freight forwarding for intra-Asia lanes.", "아시아 역내 항로 디지털 포워딩."],
    ["Routella", "Route optimization for last-mile with live constraints.", "실시간 제약을 반영한 라스트마일 경로 최적화."],
    ["Dockverra", "Dock scheduling that kills warehouse wait times.", "창고 대기 시간을 줄이는 도크 예약 시스템."],
    ["Lanevia", "Rate benchmarking and tendering for shippers.", "화주를 위한 운임 벤치마크·입찰 플랫폼."],
    ["Portelyn", "Port drayage visibility with automated appointment booking.", "항만 셔틀 운송 가시성·예약 자동화."],
    ["Movarra", "Corporate relocation logistics in one workspace.", "기업 이전 물류를 한 화면에서 관리하는 워크스페이스."],
    ["Transelle", "Cold-chain monitoring with disposable smart sensors.", "일회용 스마트 센서 기반 콜드체인 모니터링."],
    ["Haulenna", "Backhaul matching that fills empty return trips.", "공차 회송을 채우는 복화 매칭 서비스."],
    ["Velomerra", "Cargo-bike delivery networks for dense city centers.", "도심 카고바이크 배송 네트워크."],
  ],
  deeptech: [
    ["Quantrelle", "Photonic sensing modules for precision manufacturing.", "정밀 제조를 위한 광학 센싱 모듈."],
    ["Photonyra", "Free-space optical links for campus-scale networks.", "캠퍼스 규모 네트워크용 자유공간 광통신."],
    ["Nanovelle", "Nanocoating processes that replace hazardous plating.", "유해 도금을 대체하는 나노 코팅 공정."],
    ["Semilyra", "Yield analytics for compound semiconductor fabs.", "화합물 반도체 팹 수율 분석."],
    ["Orbitanna", "Attitude control systems for small satellites.", "소형 위성용 자세 제어 시스템."],
    ["Lidarelle", "Solid-state lidar for industrial safety zones.", "산업 안전 구역용 고정형 라이다."],
    ["Fuselyn", "Diagnostics instrumentation for fusion research labs.", "핵융합 연구를 위한 진단 계측 장비."],
    ["Cryovanna", "Compact cryocoolers for quantum and imaging hardware.", "양자·이미징 장비용 소형 극저온 냉각기."],
    ["Matterine", "Simulation-driven alloy discovery for additive manufacturing.", "적층 제조용 합금을 탐색하는 시뮬레이션 플랫폼."],
    ["Servomere", "High-torque actuators for collaborative robotics.", "협동 로봇용 고토크 액추에이터."],
  ],
};

/* ------------------------------------------------ Korean name renderings */
// Hangul transliterations — searchable on /ko/ and shown on KO detail pages.
const KO_NAMES = {
  ledgerine: "레저린", payvorn: "페이본", finomere: "피노미어", trestapay: "트레스타페이",
  vaultrine: "볼트린", credorna: "크레도나", remitello: "레미텔로", bursella: "버셀라",
  yieldarn: "일드아른", monvarra: "몬바라",
  opslune: "옵스룬", taskovia: "태스코비아", quorvane: "쿼베인", formyra: "포마이라",
  docurella: "도큐렐라", meetrino: "미트리노", planovae: "플라노베이", deskarna: "데스카나",
  flowbern: "플로우번", stagerly: "스테이절리",
  modelyn: "모델린", vectorna: "벡토나", inferrix: "인페릭스", tensorel: "텐소렐",
  datyrra: "다티라", corveil: "코베일", annotara: "아노타라", queryna: "쿼리나",
  embedra: "엠베드라", synthemis: "신테미스",
  medrovia: "메드로비아", curalyn: "큐라린", genotrella: "제노트렐라", vitarnelle: "비타넬",
  somnovia: "솜노비아", nurvatek: "너바텍", wellstrome: "웰스트롬", rehalyn: "리할린",
  dosierra: "도시에라", panomedra: "파노메드라",
  snackerly: "스내커리", wardovia: "워도비아", playmerra: "플레이메라", tastelyn: "테이스틀린",
  roomverra: "룸베라", petarno: "페타르노", fandelle: "팬델", grocevia: "그로세비아",
  trippara: "트리파라", souvenelle: "수브넬",
  voltarna: "볼타르나", sunverra: "선베라", gridelle: "그리델", emberlyn: "엠버린",
  thermovia: "서모비아", aeolyra: "에올리라", hydrenna: "하이드레나", circulyn: "서큘린",
  fluxella: "플럭셀라", kelverra: "켈베라",
  fleetara: "플리타라", cargolyn: "카고린", routella: "루텔라", dockverra: "도크베라",
  lanevia: "레인비아", portelyn: "포틀린", movarra: "모바라", transelle: "트랜셀",
  haulenna: "하울레나", velomerra: "벨로메라",
  quantrelle: "퀀트렐", photonyra: "포토니라", nanovelle: "나노벨", semilyra: "세밀리라",
  orbitanna: "오비타나", lidarelle: "리다렐", fuselyn: "퓨즐린", cryovanna: "크라이오바나",
  matterine: "매터린", servomere: "서보미어",
};

/* --------------------------------------------------- status assignments */
const ACQUIRED = new Set([
  "fleetara", "trestapay", "docurella", "annotara", "genotrella",
  "grocevia", "sunverra", "transelle", "lidarelle", "dosierra",
]);
const IPO = new Set([
  "snackerly", "remitello", "planovae", "vectorna", "wellstrome", "cargolyn",
]);

/* ------------------------------------------------- featured 8 (hand-written) */
const FEATURED = {
  ledgerine: {
    location: "Seoul, South Korea", founded: 2018, teamSize: 120,
    en: [
      "Ledgerine builds close and consolidation software for finance teams that operate more than one entity. What starts as a two-day spreadsheet ritual at most companies — collecting trial balances, eliminating intercompany transactions, reconciling currencies — becomes a guided, auditable pipeline that closes the books in hours.",
      "Founded in Seoul in 2018, the team deliberately sells to controllers rather than CFOs: the people who actually run the close. That focus shows up in the product's obsession with edge cases — partial ownership, mid-year acquisitions, mismatched fiscal calendars — the places where generic accounting tools quietly give up.",
    ],
    ko: [
      "레저린(Ledgerine)은 두 개 이상의 법인을 운영하는 재무팀을 위한 결산·연결 소프트웨어를 만듭니다. 시산표 취합, 내부거래 제거, 환율 조정처럼 스프레드시트로 이틀 걸리던 결산 의식을, 감사 추적이 남는 파이프라인으로 바꿔 몇 시간 안에 마감하게 합니다.",
      "2018년 서울에서 창업한 팀은 CFO가 아니라 실제로 결산을 굴리는 회계 실무 책임자에게 먼저 파는 전략을 고집해 왔습니다. 부분 지분, 연중 인수, 어긋난 회계연도처럼 범용 회계 도구가 조용히 포기하는 구석을 집요하게 다루는 것이 제품의 정체성입니다.",
    ],
  },
  opslune: {
    location: "Singapore", founded: 2019, teamSize: 85,
    en: [
      "Opslune turns incident response into something a team can actually rehearse. Runbooks live next to the alerting stack, stay executable instead of rotting in a wiki, and every step — who did what, when — is recorded for the postmortem without anyone taking notes.",
      "The company was founded in Singapore in 2019 by engineers who kept rebuilding the same internal tooling at successive jobs. Opslune's customers tend to be mid-sized platform teams: big enough to have real incidents, small enough that nobody's full-time job is writing process documents.",
    ],
    ko: [
      "옵스룬(Opslune)은 장애 대응을 '연습 가능한 것'으로 만듭니다. 런북이 위키에서 썩는 대신 알림 스택 옆에서 실행 가능한 상태로 살아 있고, 누가 언제 무엇을 했는지가 기록으로 남아 포스트모템 때 따로 받아 적을 필요가 없습니다.",
      "2019년 싱가포르에서, 이직할 때마다 같은 내부 도구를 다시 만들던 엔지니어들이 창업했습니다. 주 고객은 실제 장애를 겪을 만큼 크지만 프로세스 문서만 쓰는 전담자를 둘 만큼 크지는 않은 중간 규모 플랫폼 팀입니다.",
    ],
  },
  modelyn: {
    location: "Berlin, Germany", founded: 2021, teamSize: 60,
    en: [
      "Modelyn builds evaluation infrastructure for teams running machine learning in production. Instead of a dashboard of proxy metrics, it gives teams versioned eval suites that run on every model change — the same discipline software engineers expect from CI, applied to models.",
      "Based in Berlin since 2021, the company grew out of consulting work for industrial ML teams and kept the same sensibility: evals are written against real failure cases, not benchmarks. Customers use Modelyn to answer one question with confidence — did this change make the model better, or just different?",
    ],
    ko: [
      "모델린(Modelyn)은 프로덕션에서 머신러닝을 운영하는 팀을 위한 평가 인프라를 만듭니다. 대리 지표 대시보드 대신, 모델이 바뀔 때마다 자동 실행되는 버전 관리된 평가 스위트를 제공합니다 — 소프트웨어 엔지니어가 CI에 기대하는 규율을 모델에 적용한 셈입니다.",
      "2021년부터 베를린에 자리 잡은 이 회사는 산업용 ML 팀 컨설팅에서 출발했고, 그 감각을 그대로 유지합니다. 평가는 벤치마크가 아니라 실제 실패 사례를 기준으로 작성합니다. 고객들이 모델린으로 확신을 갖고 답하려는 질문은 하나입니다 — 이번 변경으로 모델이 좋아졌는가, 아니면 그냥 달라졌는가.",
    ],
  },
  medrovia: {
    location: "Boston, USA", founded: 2017, teamSize: 210,
    en: [
      "Medrovia is an operations platform for outpatient clinics, covering the unglamorous span from intake forms to follow-up reminders. It replaces the fax-and-clipboard layer that still runs much of ambulatory care, without asking clinics to rip out their existing medical records.",
      "Founded in Boston in 2017, the company earned its early growth clinic by clinic, shadowing front-desk staff to understand where minutes actually go. That fieldwork shaped a product principle that still holds: every automated step must be visibly faster than the paper version it replaced, or it goes back to the drawing board.",
    ],
    ko: [
      "메드로비아(Medrovia)는 외래 클리닉을 위한 운영 플랫폼입니다. 접수 서류부터 사후 안내까지, 아직도 팩스와 클립보드로 굴러가는 외래 진료의 화려하지 않은 구간을 대체하되, 기존 의무기록 시스템을 걷어내라고 요구하지 않습니다.",
      "2017년 보스턴에서 창업해, 접수 데스크 직원의 하루를 따라다니며 시간이 실제로 어디로 새는지 관찰하는 방식으로 클리닉을 한 곳씩 늘려 왔습니다. 그 현장 경험이 지금도 유지되는 제품 원칙을 만들었습니다 — 자동화된 모든 단계는 그것이 대체한 종이 절차보다 눈에 띄게 빨라야 하며, 아니면 다시 설계합니다.",
    ],
  },
  snackerly: {
    location: "Tokyo, Japan", founded: 2015, teamSize: 640,
    en: [
      "Snackerly curates monthly boxes of regional snacks sourced directly from independent makers — the small workshops that rarely reach shelves outside their own prefecture or province. Members choose a region and a spice tolerance; Snackerly handles discovery, import paperwork, and the story cards that explain what they're eating.",
      "Founded in Tokyo in 2015, the company listed publicly after building a sourcing network that now spans hundreds of independent producers across East Asia. The model stays deliberately maker-friendly: minimum order commitments and upfront payment, in exchange for exclusives that keep the boxes worth opening.",
    ],
    ko: [
      "스내커리(Snackerly)는 독립 생산자의 지역 간식을 매달 큐레이션해 배송하는 구독 서비스입니다. 자기 지역 밖 매대에는 좀처럼 오르지 못하는 작은 공방들의 제품을 발굴하고, 수입 서류 작업과 '지금 먹고 있는 것'의 이야기를 담은 카드까지 대신 챙깁니다.",
      "2015년 도쿄에서 창업했고, 동아시아 수백 곳의 독립 생산자를 잇는 소싱 네트워크를 구축한 뒤 기업공개(IPO)를 마쳤습니다. 최소 주문 약정과 선지급을 제공하는 대신 박스를 열어볼 가치가 있게 하는 독점 제품을 확보하는, 생산자 친화적인 모델을 의도적으로 유지합니다.",
    ],
  },
  voltarna: {
    location: "Helsinki, Finland", founded: 2020, teamSize: 95,
    en: [
      "Voltarna builds analytics that extend the useful life of battery fleets — buses, delivery vans, and grid storage. By modeling degradation from charge patterns and thermal history, it tells operators which packs to rotate, rest, or retire before failures get expensive.",
      "The company started in Helsinki in 2020, close to the Nordic bus fleets that became its first customers. Voltarna's wedge is honesty about uncertainty: predictions ship with confidence bands, and the product is designed around decisions operators make weekly, not lab-grade precision they can't act on.",
    ],
    ko: [
      "볼타르나(Voltarna)는 버스, 배송 밴, 계통 저장장치까지 배터리 플릿의 수명을 늘리는 분석 도구를 만듭니다. 충전 패턴과 열 이력으로 열화를 모델링해, 어떤 팩을 교대·휴지·퇴역시켜야 고장이 비싸지기 전에 막을 수 있는지 운영자에게 알려 줍니다.",
      "2020년 헬싱키에서 시작해, 첫 고객이 된 북유럽 버스 플릿 가까이에서 성장했습니다. 볼타르나의 강점은 불확실성에 대한 정직함입니다 — 예측에는 신뢰 구간이 함께 제공되고, 제품은 실험실 수준의 정밀도가 아니라 운영자가 매주 실제로 내리는 결정을 중심으로 설계됩니다.",
    ],
  },
  fleetara: {
    location: "Rotterdam, Netherlands", founded: 2016, teamSize: 180,
    en: [
      "Fleetara orchestrates mid-mile trucking for regional carriers — the runs between warehouses and distribution hubs that are too structured for the spot market and too dynamic for annual contracts. Dispatchers get load building, driver hours, and dock windows in one view.",
      "Founded in Rotterdam in 2016, the company grew across Benelux and northern Germany before being acquired by a larger logistics platform. The product continues to operate under the Fleetara name, and the founding team's scheduling engine now routes a much larger network than it started with.",
    ],
    ko: [
      "플리타라(Fleetara)는 지역 운송사의 미드마일 트럭 운송을 오케스트레이션합니다. 창고와 물류 허브 사이 구간은 스팟 시장에 맡기기엔 정형적이고 연간 계약으로 묶기엔 유동적입니다 — 배차 담당자는 적재 구성, 운전자 근무시간, 도크 시간창을 한 화면에서 관리합니다.",
      "2016년 로테르담에서 창업해 베네룩스와 북부 독일로 확장한 뒤, 더 큰 물류 플랫폼에 인수되었습니다. 제품은 지금도 플리타라라는 이름으로 운영되고 있으며, 창업팀이 만든 스케줄링 엔진은 시작할 때보다 훨씬 큰 네트워크의 경로를 계산하고 있습니다.",
    ],
  },
  quantrelle: {
    location: "Toronto, Canada", founded: 2019, teamSize: 45,
    en: [
      "Quantrelle designs photonic sensing modules for precision manufacturing lines — measuring vibration, alignment, and surface defects at speeds where mechanical sensors stop being useful. The modules are built to survive factory floors, not just optics benches.",
      "Founded in Toronto in 2019 by a team out of an academic photonics lab, the company took the slow road: two years of pilots with instrument makers before the first production order. That patience bought Quantrelle something rare in hardware — reference customers who run its modules around the clock.",
    ],
    ko: [
      "퀀트렐(Quantrelle)은 정밀 제조 라인을 위한 광학 센싱 모듈을 설계합니다. 기계식 센서가 무력해지는 속도 영역에서 진동, 정렬, 표면 결함을 측정하며, 광학 벤치가 아니라 실제 공장 바닥에서 버티도록 만들어집니다.",
      "2019년 토론토에서 광학 연구실 출신 팀이 창업했고, 일부러 느린 길을 택했습니다 — 첫 양산 수주 전까지 계측기 제조사들과 2년간 파일럿을 돌렸습니다. 그 인내가 하드웨어 분야에서 드문 자산을 만들어 주었습니다. 퀀트렐의 모듈을 24시간 돌리는 레퍼런스 고객입니다.",
    ],
  },
};

/* ----------------------------------------------------- body templates */
const P2_EN = [
  (name, region) =>
    `The product started as an internal tool and grew through word of mouth among early customers. Today ${name} serves teams across ${region}, and the roadmap stays intentionally narrow: do a small number of jobs exceptionally well.`,
  (name, region) =>
    `Rather than chasing platform breadth, ${name} ships depth: fewer features, tuned to the daily reality of its users. The company works closely with a small group of design partners across ${region} before each release.`,
  (name, region) =>
    `${name} sells to practitioners first — the people who feel the problem daily — and expands account by account. Customers across ${region} cite reliability and support quality as the reasons they stay.`,
];
const P2_KO = [
  (name, region) =>
    `제품은 초기 고객의 입소문으로 성장했습니다. 현재 ${region} 곳곳의 팀이 사용하고 있으며, 로드맵은 의도적으로 좁게 유지합니다 — 적은 수의 일을 아주 잘하는 것이 원칙입니다.`,
  (name, region) =>
    `기능의 폭을 넓히는 대신 깊이를 팝니다. 릴리스마다 ${region}의 소수 디자인 파트너와 밀착해 검증한 뒤 배포합니다.`,
  (name, region) =>
    `문제를 매일 체감하는 실무자에게 먼저 팔고, 계정 단위로 확장하는 전략을 씁니다. ${region} 고객들은 안정성과 지원 품질을 계속 쓰는 이유로 꼽습니다.`,
];
const STATUS_SENTENCE = {
  acquired: {
    en: " The company was later acquired by a larger platform in its space; the product continues to operate under the same name.",
    ko: " 이후 동종 분야의 더 큰 플랫폼에 인수되었으며, 제품은 같은 이름으로 계속 운영되고 있습니다.",
  },
  ipo: {
    en: " The company later listed publicly and continues to expand internationally.",
    ko: " 이후 기업공개(IPO)를 거쳐 해외 시장으로 확장을 이어가고 있습니다.",
  },
};

/* ---------------------------------------------------------------- build */
function lcFirst(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
function stripDot(s) {
  return s.endsWith(".") ? s.slice(0, -1) : s;
}

const companies = [];
for (const sector of SECTORS) {
  for (const [name, olEn, olKo] of COMPANIES[sector.id]) {
    const slug = name.toLowerCase();
    const h = fnv1a(slug);
    const status = ACQUIRED.has(slug) ? "acquired" : IPO.has(slug) ? "ipo" : "active";
    const featured = FEATURED[slug];

    const loc = featured
      ? LOCATIONS.find((l) => l.en === featured.location)
      : LOCATIONS[h % LOCATIONS.length];
    const region = REGION_PHRASE[loc.region];

    let founded;
    let teamSize;
    if (featured) {
      founded = featured.founded;
      teamSize = featured.teamSize;
    } else {
      founded = status === "active" ? 2014 + (h % 11) : 2012 + (h % 7); // exits skew older
      teamSize =
        status === "ipo"
          ? 300 + (h % 60) * 10
          : status === "acquired"
            ? 40 + (h % 36) * 10
            : 8 + (h % 82) * 5;
    }

    let bodyEn;
    let bodyKo;
    if (featured) {
      bodyEn = featured.en;
      bodyKo = featured.ko;
    } else {
      const v = h % 3;
      const p1En = `${name} builds ${lcFirst(stripDot(olEn))}. Founded in ${founded} and based in ${loc.en}, the team has stayed deliberately close to ${sector.focusEn}.`;
      let p2En = P2_EN[v](name, region.en);
      const p1Ko = `${founded}년 ${loc.ko}에서 시작한 이 회사의 주력 제품은 '${stripDot(olKo)}'입니다. 창업 이후 줄곧 ${sector.focusKo}에 집중해 왔습니다.`;
      let p2Ko = P2_KO[v](name, region.ko);
      if (STATUS_SENTENCE[status]) {
        p2En += STATUS_SENTENCE[status].en;
        p2Ko += STATUS_SENTENCE[status].ko;
      }
      bodyEn = [p1En, p2En];
      bodyKo = [p1Ko, p2Ko];
    }

    if (!KO_NAMES[slug]) throw new Error(`missing KO name for ${slug}`);
    companies.push({
      slug,
      name,
      koName: KO_NAMES[slug],
      sector: sector.id,
      status,
      founded,
      teamSize,
      domain: `${slug}.example`,
      featured: Boolean(featured),
      location: { en: loc.en, ko: loc.ko },
      en: { oneLiner: olEn, body: bodyEn },
      ko: { oneLiner: olKo, body: bodyKo },
    });
  }
}

/* ------------------------------------------------------------ validate */
const counts = { active: 0, acquired: 0, ipo: 0 };
for (const c of companies) counts[c.status]++;
if (companies.length !== 80) throw new Error(`expected 80 companies, got ${companies.length}`);
const slugs = new Set(companies.map((c) => c.slug));
if (slugs.size !== 80) throw new Error("duplicate slugs detected");
console.log(`companies: ${companies.length} | sectors: ${SECTORS.length} | status:`, counts);

const payload = {
  note: "FICTIONAL DATASET — every company, brand, and figure here is invented for a demo. Names are synthetic coinages.",
  sectors: SECTORS.map(({ id, en, ko }) => ({ id, en, ko })),
  statuses: STATUSES,
  companies,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`wrote ${OUT}`);
