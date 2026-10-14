# VC Portfolio Directory — bilingual static export

> **Fictional dataset.** Every company, brand, logo, and figure on the site
> is fictional (synthetic coinages).
> 등장하는 투자사명·80개 기업·데이터는 전부 가상입니다.

**Live**: https://sungwooklim02.github.io/vc-portfolio-directory-demo/
(EN main · [한국어](https://sungwooklim02.github.io/vc-portfolio-directory-demo/ko/)) — the July 2026 build.
The October 2026 renewal (search, map view, 3D hero, webfont) is served by `server.mjs`:
https://vc-directory-renewal-production.up.railway.app/vc-portfolio-directory-demo/

A YC-style *portfolio directory* — 80 fictional companies, grid + instant
search + sector/status filters, per-company detail pages — built as a fully
static site in two languages (English main at `/`, Korean at `/ko/`).

## What it demonstrates

| Claim | How to verify |
|---|---|
| 80-company grid, search, sector(8)/status(3) filters, empty state | Home page — all 80 cards are in the initial HTML (view-source), filtering is client-side |
| Search that forgives typos and understands Korean input | Search box: fuzzy match (Fuse.js), Korean initial consonants (`ㄹㅈㄹ`), English-keyboard Korean (`fpwjfls` → suggestion), highlighted matches, keyboard suggestions (`/`, ↑↓, Enter, Esc) — `npm test` covers the matcher |
| Shareable filter state | Every filter, the sort, the view and the year range live in the URL (`?sector=…&city=…&from=…`); reload, back/forward and the language switch keep them |
| Map view + charts | "Map" view: HQ cities on a local world map (Apache ECharts, SVG), companies-by-sector bars, founding-year histogram with a range slider — all wired to the same filters as the grid |
| 3D hero | The hero mark is a three.js scene (80 companies on three orbits, lit, drag-rotate with limits, hover + click to a company, reset view); 2D fallback with `?webgl=0`, without WebGL and on phones (under 601px, where it is a background mark); hovering a dot marks its card; reduced motion draws one still frame; `?capture=1` loads the scene at once and sets `<html data-orbit-ready="1">` on the final frame |
| Detail pages ×80×2 languages from one data file | `scripts/gen-companies.mjs` → `data/companies.json` → `generateStaticParams` (166 static HTML pages) |
| Standard explicit-path i18n | EN root + `/ko/` subpath, per-page language switch, `hreflang` en/ko/`x-default` link tags on every page (view-source), `og:locale`, sitemap with alternates |
| Overseas latency posture | Static generation + edge CDN (GitHub Pages/Fastly). Multi-region TTFB measured below |
| Performance budget (2026-07, GitHub Pages build) | Zero webfonts (100% system font stack), zero raster images (all logos/covers are deterministic inline SVG), first-load JS ≈ 111 kB raw before compression |
| Performance budget (2026-10 renewal build, measured with `npm run build`) | See [Renewal build budget](#renewal-build-budget-2026-10) — self-hosted subset webfont, heavy libraries loaded only when used, `scripts/verify-uplift.mjs` fails the build over budget |

Honest scope: **visitor-facing screens only.** No admin CMS, no accounts, no
login UI anywhere, no backend. Company "websites" are fictional, so external
link buttons show a notice instead of navigating. See the in-site page
[About this site](https://sungwooklim02.github.io/vc-portfolio-directory-demo/demo/).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS · `output: "export"` ·
`basePath` + `trailingSlash` for GitHub Pages · route-group dual root layouts
(`<html lang="en">` / `<html lang="ko">`) · all route files are thin wrappers
that inject a locale into shared view components.

Fonts: the July build shipped no webfont. The October renewal self-hosts one
variable typeface (Pretendard 1.3.9 under the SIL OFL, subset and renamed
"Renewal Sans" as the licence requires), split into four `unicode-range` chunks
so each page downloads only the glyphs it renders — see
[`public/fonts/FONT-LICENSES.md`](./public/fonts/FONT-LICENSES.md).

Third-party code and data shipped by the site, with versions and licences:
[`public/vendor/LICENSES.md`](./public/vendor/LICENSES.md). Nothing is loaded
from another host at runtime (the build checks this).

## Build & verify

```bash
npm ci
npm run build   # gen data -> fonts + vendor bundles -> next build -> 404/.nojekyll -> verification
npm test        # search matcher + static server (node:test)
PORT=3000 npm start   # serve out/ at http://localhost:3000/vc-portfolio-directory-demo/
```

`scripts/verify-out.mjs` fails the build unless every exported page has the
hreflang triple, the correct `<html lang>`, the fictional-data badge, the
fictional-data footer notice, and `og:locale`. `scripts/verify-uplift.mjs` then
checks the JavaScript budgets below, that no page requests another host, that
the generated fonts/bundles/licences are present, and runs a name scan.

### Renewal build budget (2026-10)

Measured on the build output with Node `zlib` gzip level 9 (the hosting edge's own
compression level was not measured). Fonts are woff2 file sizes.

| What | When it loads | Size |
|---|---|---|
| Home first-screen JS (modern chunks + motion kit, EN = KO) | first paint | 142,775 B |
| three.js bundle (core + OrbitControls) + 3D scene code | home at 601px and wider, on idle after first paint (phones draw the orbit with the 2D canvas instead) | +143,588 B + 3,774 B → 290,137 B with the first screen (budget 300,000 B) |
| Fuse.js + es-hangul chunks | first focus of the search box | 7,648 B + 7,149 B |
| Apache ECharts bundle + map view code + world map data | first open of the map view | 201,205 B + 6,724 B + 38,063 B |
| Company page first-screen JS | first paint | 140,505 B |
| All JavaScript in the build (37 files, legacy polyfills included) | — | 664,590 B (budget 1,000,000 B) |
| Webfont, English pages | first paint | 47,644 B (Latin) + 6,088 B (the few Hangul glyphs on English pages) |
| Webfont, Korean pages | first paint | + 99,044 B (Hangul used by the site) |
| Webfont, other Hangul | only when such text is typed into search | 337,920 B |

Deploy: `npm run deploy` (local build → `gh-pages -d out --dotfiles`).

## Multi-region TTFB measurement

Method: [globalping.io](https://globalping.io) HTTP measurements against the
live home page (`GET /vc-portfolio-directory-demo/`, HTTPS), one probe per
region (KR · JP · SG · US · DE · GB), two passes:

- **Pass 1 "cold"**: first request from that probe — edge cache state unknown
  (typically `x-cache: MISS` on POPs that have not seen the URL within TTL).
- **Pass 2 "warm"**: repeated within ~60 s (Pages serves `cache-control:
  max-age=600`, so a HIT is expected on the same POP).

Raw JSON for both passes is committed as measurement evidence:
[`ttfb-globalping.json`](./ttfb-globalping.json) in this repository. Numbers are recorded
as observed — no cherry-picking. Limitations: single point in time, probes may
land on different POPs between passes, and a free-tier edge (GitHub Pages)
offers no TTL/invalidation control — a production build would use an edge CDN
with explicit invalidation (e.g., S3 + CloudFront) for the same architecture
with operational control.

### Results (2026-07-18 00:33 UTC, single run — recorded as observed)

| Region (probe city) | Cold TTFB | Cold x-cache | Warm TTFB | Warm x-cache |
|---|---|---|---|---|
| KR (Chuncheon → Seoul¹) | 258 ms | HIT | 205 ms | MISS |
| JP (Tokyo) | 186 ms | MISS | **5 ms** | HIT |
| SG (Singapore) | 260 ms | MISS | **3 ms** | HIT |
| US (Buffalo) | 57 ms | MISS | **18 ms** | HIT |
| DE (Falkenstein) | 124 ms | MISS | **17 ms** | HIT |
| GB (London) | 94 ms | MISS | 107 ms | MISS² |

¹ globalping assigned a different KR probe on pass 2 (Chuncheon → Seoul), so
the warm pass was effectively another cold hit on a different POP.
² Same-city probe but the second request still missed (different POP or
eviction) — kept as observed.

Reading: warm HITs of **3–18 ms** show what static + edge delivery does for
overseas users. The MISS rows show the flip side of a free-tier edge: no
control over POP routing or TTL. A production build keeps the same
architecture but adds operational control (e.g., S3 + CloudFront with explicit
invalidation and a Seoul edge location).

## License

MIT — portfolio purposes. Fictional dataset included.
