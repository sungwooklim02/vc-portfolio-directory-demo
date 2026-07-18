# [DEMO] VC Portfolio Directory — bilingual static export

> **This is a self-built demo, not a client deliverable.** Every company,
> brand, logo, and figure on the site is fictional (synthetic coinages).
> 자체 제작 데모입니다. 클라이언트 수주·납품 실적이 아니며, 등장하는 투자사명·80개
> 기업·데이터는 전부 가상입니다.

**Live**: https://sungwooklim02.github.io/vc-portfolio-directory-demo/
(EN main · [한국어](https://sungwooklim02.github.io/vc-portfolio-directory-demo/ko/))

A YC-style *portfolio directory* — 80 fictional companies, grid + instant
search + sector/status filters, per-company detail pages — built as a fully
static site in two languages (English main at `/`, Korean at `/ko/`).

## What it demonstrates

| Claim | How to verify |
|---|---|
| 80-company grid, search, sector(8)/status(3) filters, empty state | Home page — all 80 cards are in the initial HTML (view-source), filtering is client-side |
| Detail pages ×80×2 languages from one data file | `scripts/gen-companies.mjs` → `data/companies.json` → `generateStaticParams` (166 static HTML pages) |
| Standard explicit-path i18n | EN root + `/ko/` subpath, per-page language switch, `hreflang` en/ko/`x-default` link tags on every page (view-source), `og:locale`, sitemap with alternates |
| Overseas latency posture | Static generation + edge CDN (GitHub Pages/Fastly). Multi-region TTFB measured below |
| Performance budget | Zero webfonts (100% system font stack), zero raster images (all logos/covers are deterministic inline SVG), first-load JS ≈ 111 kB raw before compression |

Honest scope: **visitor-facing screens only.** No admin CMS, no accounts, no
login UI anywhere, no backend. Company "websites" are fictional, so external
link buttons show a demo notice instead of navigating. See the in-site page
[About this demo](https://sungwooklim02.github.io/vc-portfolio-directory-demo/demo/).

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS · `output: "export"` ·
`basePath` + `trailingSlash` for GitHub Pages · route-group dual root layouts
(`<html lang="en">` / `<html lang="ko">`) · all route files are thin wrappers
that inject a locale into shared view components.

Note on fonts: this demo deliberately ships **0 KB of webfonts** to keep the
performance evidence clean (Korean webfonts are hundreds of KB). A production
build would self-host a brand font via `next/font`.

## Build & verify

```bash
npm install
npm run build   # gen data -> next build -> 404/.nojekyll -> mechanical verification
```

`scripts/verify-out.mjs` fails the build unless every exported page has the
hreflang triple, the correct `<html lang>`, the DEMO badge, the fictional-data
footer notice, and `og:locale`.

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

MIT — demo/portfolio purposes. Fictional dataset included.
