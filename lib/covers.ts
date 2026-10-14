/**
 * Detail-page cover photos: 4 per sector, licensed CC0 / public domain (source page, author and licence of
 * every file in public/img/CREDITS.md). Files: public/img/covers/<id>-{1600,800}.{avif,webp}.
 * `tone` is the photo's dominant colour, painted behind the image while it loads; `focus` is the CSS
 * object-position used when the frame crops further (phone widths).
 * The photos are atmosphere for the sector only — they never show the fictional company.
 */
import type { Locale } from "./i18n";

export interface CoverInfo {
  tone: string;
  focus: string;
  alt: Record<Locale, string>;
}

const STOCK = { en: " — stock photo", ko: " — 분위기용 스톡 사진" };
const c = (tone: string, en: string, ko: string, focus = "50% 50%"): CoverInfo => ({
  tone,
  focus,
  alt: { en: en + STOCK.en, ko: ko + STOCK.ko },
});

export const COVERS: Record<string, CoverInfo> = {
  "fintech-1": c("#d8d8d8", "Calculator and a printed investment table with a pen", "계산기와 투자 수익 표가 인쇄된 종이, 만년필", "40% 50%"),
  "fintech-2": c("#eeeeee", "Stacks of silver coins rising from left to right", "왼쪽에서 오른쪽으로 높아지는 은색 동전 더미"),
  "fintech-3": c("#784868", "City skyline silhouetted against a pink dusk sky", "분홍빛 노을을 배경으로 한 도심 스카이라인 실루엣"),
  "fintech-4": c("#0b0b0b", "Glowing green digits on a vacuum fluorescent display", "형광 표시관에 빛나는 초록색 숫자"),
  "saas-1": c("#f4f4f4", "Minimal white desk with a lamp, a laptop and a stack of books", "램프와 노트북, 책이 놓인 미니멀한 흰 책상", "45% 60%"),
  "saas-2": c("#e9e4dc", "Open laptop on a wooden desk in front of bookshelves", "책장 앞 원목 책상 위에 펼친 노트북"),
  "saas-3": c("#e8c8a8", "Bright open-plan office with desks, plants and a lounge corner", "책상과 화분, 라운지가 있는 밝은 오픈형 사무실"),
  "saas-4": c("#181818", "Close-up of a backlit laptop keyboard", "백라이트가 켜진 노트북 키보드 근접 사진"),
  "ai-1": c("#c87a34", "Circuit board with chips and capacitors, close-up", "칩과 콘덴서가 꽂힌 회로 기판 근접 사진"),
  "ai-2": c("#1a0a1a", "Neon light trails along a city street at night", "밤거리를 가로지르는 네온 빛줄기"),
  "ai-3": c("#0a0a18", "Long-exposure light trails on a curving highway at night", "곡선 고속도로 위 장노출 빛줄기"),
  "ai-4": c("#281818", "Star trails above the curve of the Earth, seen from orbit", "궤도에서 본 지구 곡면 위 별의 궤적"),
  "health-1": c("#e6eef0", "Gloved hands handling a sample bottle inside a lab isolator", "실험실 격리 작업대 안에서 장갑 낀 손으로 시료병을 다루는 모습"),
  "health-2": c("#584828", "Laboratory benches lined with microscopes", "현미경이 줄지어 놓인 실험 벤치"),
  "health-3": c("#1c1c1c", "Close-up of a microscope stage and objective", "현미경 재물대와 대물렌즈 근접 사진"),
  "health-4": c("#a8a898", "Long, empty hospital corridor", "길게 이어진 빈 병원 복도"),
  "consumer-1": c("#181818", "Hands holding a smartphone in low light", "어두운 곳에서 스마트폰을 든 손"),
  "consumer-2": c("#d8442a", "Rows of colourful neckties on a shop display", "매장 진열대에 걸린 형형색색의 넥타이"),
  "consumer-3": c("#a8743c", "Trays of croissants and sugar-topped brioche in a bakery display", "크루아상과 설탕 토핑 브리오슈가 놓인 베이커리 진열 트레이"),
  "consumer-4": c("#282828", "Over-ear headphones on a wooden surface, black and white", "나무 위에 놓인 헤드폰, 흑백 사진"),
  "climate-1": c("#586878", "Rows of solar panels under a blue sky", "파란 하늘 아래 줄지어 선 태양광 패널"),
  "climate-2": c("#88b8e8", "Wind turbines against a clear sky", "맑은 하늘을 배경으로 선 풍력 발전기"),
  "climate-3": c("#3a3a28", "Aerial view of an autumn forest split by a road", "도로가 가로지르는 가을 숲 항공 사진"),
  "climate-4": c("#181818", "Wind turbines silhouetted at sunset", "해 질 녘 실루엣으로 보이는 풍력 발전기"),
  "deeptech-1": c("#5a3020", "Patterned silicon wafer in its carrier under clean-room light", "클린룸 조명 아래 캐리어에 담긴 패턴 실리콘 웨이퍼"),
  "deeptech-2": c("#4a4430", "Machined gold-anodised instrument housing with blue cabling", "금색 아노다이징 가공 계측 장비 하우징과 파란 케이블"),
  "deeptech-3": c("#081008", "Optics bench lit by a green laser", "초록 레이저가 비추는 광학 실험대"),
  "deeptech-4": c("#0b0b0b", "3D printer nozzle building a yellow part", "노란 부품을 적층 중인 3D 프린터 노즐"),
  "logistics-1": c("#b8c8e8", "Silhouette of a container crane against a pale evening sky", "옅은 저녁 하늘에 실루엣으로 선 컨테이너 크레인"),
  "logistics-2": c("#5a4a3a", "Pallets of boxed goods on warehouse racking", "창고 랙에 쌓인 상자 화물 팔레트"),
  "logistics-3": c("#383828", "Aerial view of a road through dense forest", "울창한 숲을 가로지르는 도로 항공 사진"),
  "logistics-4": c("#1a1a1a", "Warehouse aisles with high pallet racking", "높은 팔레트 랙이 늘어선 물류 창고 통로"),
};

export function coverInfo(id: string): CoverInfo {
  const info = COVERS[id];
  if (!info) throw new Error(`unknown cover id ${id}`);
  return info;
}
