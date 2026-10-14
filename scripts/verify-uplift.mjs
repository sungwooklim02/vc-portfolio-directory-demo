/**
 * verify-uplift.mjs — last build step for the 2026-10 completeness uplift. Exit 1 on any FAIL.
 *
 *  1. Budgets (gzip level 9, Node zlib):
 *       first-screen JS of the EN and KO home = modern <script src> files in the HTML (nomodule
 *       polyfills excluded) incl. mk/motion-kit.js            <= 300,000 B   FAIL
 *       first screen + the three.js bundle injected on idle + the scene chunk (components/orbit/OrbitScene.ts,
 *       found by its "createOrbitScene" export name; the home loads it on idle at 601px+)  <= 300,000 B   FAIL
 *       every JS file in out/ (Next chunks + vendor bundles)     <= 1,000,000 B FAIL
 *  2. No runtime request to another host: <script src>, <link rel=stylesheet|preload|modulepreload|icon>,
 *     CSS url()/@import, and fetch()/import()/script-src strings in JS must not point at http(s)://.
 *     (canonical/alternate/og meta and plain <a href> are links, not requests.)
 *  3. Trade-name scan: out/ (text files) + repository source + file names. The pattern is assembled
 *     from character codes so this file does not contain it.
 *  4. Generated assets present (4 font chunks, 2 vendor bundles, 1 geo file); the unsubsetted
 *     source font is not served.
 *  5. Licence index lists every shipped third-party package and the licence texts exist.
 *  6. (WARN) Hangul visible on English pages is covered by the small kr-en font chunk.
 *  7. Imagery: detail cover photos present/sized/alt, brand marks drawn, avatars local, metadata stripped,
 *     trade name absent from image bytes, cover weight budget.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "out");
const BASE = "/vc-portfolio-directory-demo";
const FIRST_SCREEN_MAX = 300_000;
const TOTAL_MAX = 1_000_000;

const fails = [];
const warns = [];
const rel = (p) => relative(ROOT, p).split(sep).join("/");
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const fmt = (n) => n.toLocaleString("en-US");

function* walk(dir, skip = () => false) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skip(name, p)) continue;
    if (statSync(p).isDirectory()) yield* walk(p, skip);
    else yield p;
  }
}

if (!existsSync(OUT)) {
  console.error("verify-uplift: out/ not found — run next build first");
  process.exit(1);
}

// ── 1. budgets ────────────────────────────────────────────────────────────────────────────────
const outPath = (src) => {
  const u = src.replace(/&amp;/g, "&").split(/[?#]/)[0];
  if (!u.startsWith(BASE + "/")) return null;
  return join(OUT, ...u.slice(BASE.length + 1).split("/"));
};
function firstScreen(page) {
  const html = readFileSync(join(OUT, page), "utf8");
  const files = new Set();
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    const attrs = m[1];
    if (/\bnomodule\b/i.test(attrs)) continue;
    const src = attrs.match(/\bsrc="([^"]+)"/i)?.[1];
    if (src) files.add(src);
  }
  for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1];
    if (!/\brel="(?:preload|modulepreload)"/i.test(attrs) || !/\bas="script"/i.test(attrs)) continue;
    const href = attrs.match(/\bhref="([^"]+)"/i)?.[1];
    if (href) files.add(href);
  }
  let total = 0;
  const rows = [];
  for (const src of files) {
    const p = outPath(src);
    if (!p || !existsSync(p)) {
      fails.push(`${page}: script ${src} not found in out/`);
      continue;
    }
    const size = gz(readFileSync(p));
    total += size;
    rows.push([src.slice(BASE.length + 1), size]);
  }
  return { total, rows };
}
const vendorDir = join(OUT, "vendor");
const threeFile = existsSync(vendorDir) ? readdirSync(vendorDir).find((n) => /^three-lite-.*\.min\.js$/.test(n)) : undefined;
const threeGz = threeFile ? gz(readFileSync(join(vendorDir, threeFile))) : 0;
// the 3D scene code is its own Next chunk (dynamic import), fetched together with the three bundle
let sceneGz = 0;
{
  // top-level async chunks only, and not one the home HTML already loads (the page chunk names the export too)
  const chunkDir = join(OUT, "_next", "static", "chunks");
  const homeHtml = readFileSync(join(OUT, "index.html"), "utf8");
  for (const name of readdirSync(chunkDir)) {
    const p = join(chunkDir, name);
    if (extname(name) !== ".js" || statSync(p).isDirectory() || homeHtml.includes(name)) continue;
    if (readFileSync(p, "utf8").includes("createOrbitScene")) sceneGz += gz(readFileSync(p));
  }
}
if (!sceneGz) fails.push("3D scene chunk (createOrbitScene) not found in out/_next/static/chunks");
const echartsFile = existsSync(vendorDir) ? readdirSync(vendorDir).find((n) => /^echarts-lite-.*\.min\.js$/.test(n)) : undefined;
const echartsGz = echartsFile ? gz(readFileSync(join(vendorDir, echartsFile))) : 0;

const budget = {};
for (const page of ["index.html", join("ko", "index.html")]) {
  const { total, rows } = firstScreen(page);
  budget[page] = total;
  console.log(`first-screen JS ${page.split(sep).join("/")}: ${fmt(total)} B gzip-9 (${rows.length} files)`);
  for (const [f, s] of rows.sort((a, b) => b[1] - a[1])) console.log(`    ${String(fmt(s)).padStart(8)}  ${f}`);
  if (total > FIRST_SCREEN_MAX) fails.push(`${page}: first-screen JS ${fmt(total)} B > ${fmt(FIRST_SCREEN_MAX)} B`);
  const with3d = total + threeGz + sceneGz;
  console.log(`  + ${threeFile ?? "three bundle (missing)"} ${fmt(threeGz)} B + scene chunk ${fmt(sceneGz)} B on idle -> ${fmt(with3d)} B`);
  if (with3d > FIRST_SCREEN_MAX) fails.push(`${page}: first screen + three ${fmt(with3d)} B > ${fmt(FIRST_SCREEN_MAX)} B`);
}
let totalJs = 0;
let jsFiles = 0;
for (const p of walk(OUT)) {
  if (extname(p) !== ".js") continue;
  totalJs += gz(readFileSync(p));
  jsFiles++;
}
console.log(`all JS in out/: ${fmt(totalJs)} B gzip-9 (${jsFiles} files; three ${fmt(threeGz)}, echarts ${fmt(echartsGz)})`);
if (totalJs > TOTAL_MAX) fails.push(`all JS ${fmt(totalJs)} B > ${fmt(TOTAL_MAX)} B`);
const geoDir = join(vendorDir, "geo");
const geoFiles = existsSync(geoDir) ? readdirSync(geoDir).filter((n) => n.endsWith(".json")) : [];
for (const g of geoFiles) console.log(`geo data ${g}: ${fmt(gz(readFileSync(join(geoDir, g))))} B gzip-9 (fetched with the map view)`);

// ── 2. runtime external requests ─────────────────────────────────────────────────────────────
const EXT = /^(?:https?:)?\/\//i;
const TEXT_EXT = new Set([".html", ".js", ".css", ".json", ".txt", ".xml", ".md", ".svg", ".webmanifest", ".map", ".mjs"]);
for (const p of walk(OUT)) {
  const ext = extname(p);
  const r = relative(OUT, p).split(sep).join("/");
  if (ext === ".html") {
    const html = readFileSync(p, "utf8");
    for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)) if (EXT.test(m[1])) fails.push(`${r}: external script ${m[1]}`);
    for (const m of html.matchAll(/<link\b([^>]*)>/gi)) {
      const relAttr = m[1].match(/\brel="([^"]+)"/i)?.[1] ?? "";
      const href = m[1].match(/\bhref="([^"]+)"/i)?.[1] ?? "";
      if (/\b(?:stylesheet|preload|modulepreload|prefetch|preconnect|dns-prefetch|icon|apple-touch-icon|manifest)\b/i.test(relAttr) && EXT.test(href))
        fails.push(`${r}: external <link rel="${relAttr}"> ${href}`);
    }
    for (const m of html.matchAll(/<(?:img|iframe|video|audio|source)\b[^>]*\bsrc="([^"]+)"/gi)) if (EXT.test(m[1])) fails.push(`${r}: external media ${m[1]}`);
  } else if (ext === ".css") {
    const css = readFileSync(p, "utf8");
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)/gi)) if (EXT.test(m[1])) fails.push(`${r}: external url() ${m[1]}`);
    for (const m of css.matchAll(/@import\s+(?:url\()?\s*["']?([^"');]+)/gi)) if (EXT.test(m[1])) fails.push(`${r}: external @import ${m[1]}`);
  } else if (ext === ".js") {
    const js = readFileSync(p, "utf8");
    const pats = [
      /fetch\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/g,
      /import\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/g,
      /\.src\s*=\s*["'`]((?:https?:)?\/\/[^"'`]+)/g,
      /sendBeacon\(\s*["'`]((?:https?:)?\/\/[^"'`]+)/g,
      /new\s+(?:WebSocket|EventSource|Worker)\(\s*["'`]((?:wss?:|https?:)?\/\/[^"'`]+)/g,
    ];
    for (const re of pats) for (const m of js.matchAll(re)) fails.push(`${r}: external request string ${m[1]}`);
  }
}

// ── 3. trade-name scan ───────────────────────────────────────────────────────────────────────
const NAME = new RegExp(
  [String.fromCharCode(109, 111, 118, 101, 110), String.fromCharCode(0xbaa8, 0xbca4)].join("|"),
  "i",
);
const BIN = new Set([".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".avif"]);
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "out"]);
let scanned = 0;
const scan = (p, label) => {
  if (NAME.test(label)) fails.push(`trade name in file name: ${label}`);
  if (BIN.has(extname(p).toLowerCase())) return;
  scanned++;
  const lines = readFileSync(p, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (NAME.test(line)) fails.push(`trade name in ${label}:${i + 1}`);
  });
};
for (const p of walk(OUT)) scan(p, "out/" + relative(OUT, p).split(sep).join("/"));
for (const p of walk(ROOT, (name) => SKIP_DIRS.has(name))) scan(p, rel(p));
console.log(`trade-name scan: ${scanned} text files (out/ + source), ${fails.filter((f) => f.startsWith("trade name")).length} hit(s)`);

// ── 4. generated assets ──────────────────────────────────────────────────────────────────────
const fontsOut = join(OUT, "fonts");
const chunks = existsSync(fontsOut) ? readdirSync(fontsOut).filter((n) => /^rs-[a-z-]+-[0-9a-f]{10}\.woff2$/.test(n)) : [];
const want = ["latin", "kr-en", "kr-site", "kr-rest"];
for (const id of want) if (!chunks.some((n) => n.startsWith(`rs-${id}-`))) fails.push(`font chunk ${id} missing in out/fonts`);
if (chunks.length !== want.length) fails.push(`expected ${want.length} font chunks in out/fonts, found ${chunks.length} (stale chunk left behind?)`);
if (!threeFile) fails.push("three vendor bundle missing in out/vendor");
if (!echartsFile) fails.push("echarts vendor bundle missing in out/vendor");
if (geoFiles.length !== 1) fails.push(`expected 1 geo file in out/vendor/geo, found ${geoFiles.length}`);
for (const p of walk(OUT)) if (/PretendardVariable/i.test(p)) fails.push(`unsubsetted source font served: ${relative(OUT, p)}`);
for (const p of walk(join(ROOT, "public"))) if (/PretendardVariable/i.test(p)) fails.push(`unsubsetted source font in public/: ${rel(p)}`);
for (const f of ["fonts/OFL.txt", "fonts/FONT-LICENSES.md"]) if (!existsSync(join(OUT, f))) fails.push(`out/${f} missing`);

// ── 5. licences ──────────────────────────────────────────────────────────────────────────────
const licIndex = join(OUT, "vendor", "LICENSES.md");
if (!existsSync(licIndex)) fails.push("out/vendor/LICENSES.md missing");
else {
  const idx = readFileSync(licIndex, "utf8");
  for (const n of ["three", "echarts", "zrender", "tslib", "topojson-client", "world-atlas", "Natural Earth", "fuse.js", "es-hangul", "lucide-react", "Pretendard"])
    if (!idx.includes(n)) fails.push(`LICENSES.md does not list ${n}`);
}
const licDir = join(OUT, "vendor", "licenses");
for (const f of [
  "three-LICENSE.txt", "echarts-LICENSE.txt", "echarts-NOTICE.txt", "zrender-LICENSE.txt", "tslib-LICENSE.txt",
  "topojson-client-LICENSE.txt", "world-atlas-LICENSE.txt", "fuse.js-LICENSE.txt", "es-hangul-LICENSE.txt", "lucide-react-LICENSE.txt",
])
  if (!existsSync(join(licDir, f))) fails.push(`licence text missing: vendor/licenses/${f}`);
if (existsSync(join(licDir, "echarts-NOTICE.txt")) && !/Apache ECharts/.test(readFileSync(join(licDir, "echarts-NOTICE.txt"), "utf8")))
  fails.push("echarts NOTICE text does not name Apache ECharts");

// ── 6. Hangul on English pages vs the kr-en chunk (WARN) ─────────────────────────────────────
const fontCss = readFileSync(join(ROOT, "app", "fonts.generated.css"), "utf8");
const krEnRule = fontCss.split("@font-face").find((r) => r.includes("rs-kr-en-"));
const krEn = new Set();
for (const tok of (krEnRule?.match(/unicode-range:([^;}]+)/)?.[1] ?? "").split(",")) {
  const m = tok.trim().match(/^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i);
  if (!m) continue;
  const a = parseInt(m[1], 16);
  const b = m[2] ? parseInt(m[2], 16) : a;
  for (let c = a; c <= b; c++) krEn.add(c);
}
const missing = new Map();
for (const p of walk(OUT, (name) => name === "_next" || name === "ko")) {
  if (extname(p) !== ".html" || p.endsWith("404.html")) continue;
  const visible = readFileSync(p, "utf8")
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");
  for (const ch of visible) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xac00 && cp <= 0xd7a3 && !krEn.has(cp)) missing.set(ch, relative(OUT, p).split(sep).join("/"));
  }
}
if (missing.size) warns.push(`${missing.size} Hangul glyph(s) on EN pages outside the kr-en chunk (first: ${[...missing.values()][0]})`);

// ── 7. imagery (2026-10 2D rework) ──────────────────────────────────────────────────────────────
//  - every detail page (EN + KO) has exactly one cover <img data-cover-photo> with alt, width/height, and every
//    file in its src/srcset exists in out/; no old generated SVG cover remains
//  - every brand mark is a drawn mark (no <text> monogram); team avatars are local images
//  - raster images carry no EXIF/XMP/IPTC metadata, SVG images no <metadata>/<script>/external refs;
//    image bytes are trade-name scanned too; cover weights stay within budget
{
  const data = JSON.parse(readFileSync(join(ROOT, "data", "companies.json"), "utf8"));
  const srcFiles = (tag) => {
    const list = [];
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
    if (src) list.push(src);
    const set = tag.match(/\bsrcset="([^"]+)"/i)?.[1];
    if (set) for (const part of set.split(",")) list.push(part.trim().split(/\s+/)[0]);
    return list;
  };
  let covers = 0;
  for (const c of data.companies) {
    for (const page of [`companies/${c.slug}/index.html`, `ko/companies/${c.slug}/index.html`]) {
      const fp = join(OUT, ...page.split("/"));
      if (!existsSync(fp)) {
        fails.push(`${page} missing`);
        continue;
      }
      const html = readFileSync(fp, "utf8");
      const imgs = [...html.matchAll(/<img\b[^>]*data-cover-photo="([^"]+)"[^>]*>/gi)];
      if (imgs.length !== 1) {
        fails.push(`${page}: expected 1 cover photo, found ${imgs.length}`);
        continue;
      }
      const tag = imgs[0][0];
      if (imgs[0][1] !== c.cover) fails.push(`${page}: cover ${imgs[0][1]} != dataset ${c.cover}`);
      if (!/\balt="[^"]{8,}"/.test(tag)) fails.push(`${page}: cover alt missing`);
      if (!/\bwidth="1600"/.test(tag) || !/\bheight="560"/.test(tag)) fails.push(`${page}: cover width/height attrs missing`);
      const sources = [...html.matchAll(/<source\b[^>]*>/gi)].map((m) => m[0]).filter((t) => t.includes("/img/covers/"));
      for (const u of [tag, ...sources].flatMap(srcFiles)) {
        const p = outPath(u);
        if (!p || !existsSync(p)) fails.push(`${page}: cover file ${u} not in out/`);
      }
      if (/Auto-generated cover artwork/.test(html)) fails.push(`${page}: old SVG cover art still rendered`);
      covers++;
    }
  }
  const home = readFileSync(join(OUT, "index.html"), "utf8");
  const marks = [...home.matchAll(/<svg\b[^>]*aria-label="[^"]*fictional brand mark\)"[^>]*>([\s\S]*?)<\/svg>/gi)];
  if (marks.length < 80) fails.push(`home: expected >= 80 brand marks, found ${marks.length}`);
  for (const m of marks) if (/<text\b/i.test(m[1]) || !/<(?:path|circle|rect)\b/i.test(m[1])) fails.push("home: a brand mark is not a drawn mark");
  for (const page of ["about/index.html", "ko/about/index.html"]) {
    const html = readFileSync(join(OUT, ...page.split("/")), "utf8");
    const av = [...html.matchAll(/<img\b[^>]*data-team-avatar[^>]*>/gi)].map((m) => m[0]);
    if (av.length !== 5) fails.push(`${page}: expected 5 team avatars, found ${av.length}`);
    for (const t of av) {
      for (const u of srcFiles(t)) if (!outPath(u) || !existsSync(outPath(u))) fails.push(`${page}: avatar ${u} not in out/`);
      if (!/\balt="[^"]{6,}"/.test(t)) fails.push(`${page}: avatar alt missing`);
    }
  }
  const imgDir = join(OUT, "img");
  const META = /Exif\x00\x00|<x:xmpmeta|ns\.adobe\.com\/xap|Photoshop 3\.0|8BIM/;
  let rasters = 0;
  let coverBytes = 0;
  const coverByFmt = { ".avif": 0, ".webp": 0 };
  if (!existsSync(imgDir)) fails.push("out/img missing");
  else
    for (const p of walk(imgDir)) {
      const r = "out/" + relative(OUT, p).split(sep).join("/");
      const ext = extname(p).toLowerCase();
      const buf = readFileSync(p);
      const latin = buf.toString("latin1");
      if (NAME.test(latin) || NAME.test(buf.toString("utf8"))) fails.push(`trade name inside image bytes: ${r}`);
      if (ext === ".webp" || ext === ".avif" || ext === ".jpg" || ext === ".png") {
        rasters++;
        if (META.test(latin) || /\bExif\b/.test(latin.slice(0, 4096))) fails.push(`image metadata not stripped: ${r}`);
        if (r.includes("/img/covers/")) {
          coverBytes += buf.length;
          if (ext in coverByFmt) coverByFmt[ext] += buf.length;
          const big = r.includes("-1600.");
          const lim = big ? 120_000 : 60_000;
          const soft = big ? 90_000 : 40_000;
          if (buf.length > lim) fails.push(`${r}: ${fmt(buf.length)} B over ${fmt(lim)} B`);
          else if (buf.length > soft) warns.push(`${r}: ${fmt(buf.length)} B over the ${fmt(soft)} B target`);
        }
      } else if (ext === ".svg") {
        const t = buf.toString("utf8");
        if (/<metadata|<script|<foreignObject|(?:href|src)="(?:https?:)?\/\/|url\((?:https?:)?\/\//i.test(t)) fails.push(`unsafe/unstripped SVG: ${r}`);
      } else if (ext !== ".md") fails.push(`unexpected file type in out/img: ${r}`);
    }
  // a browser downloads one format, so the budget is per format (AVIF first, WebP fallback)
  for (const [x, n] of Object.entries(coverByFmt)) if (n > 3_500_000) fails.push(`covers ${x} total ${fmt(n)} B > 3,500,000 B`);
  if (!existsSync(join(OUT, "img", "CREDITS.md"))) fails.push("out/img/CREDITS.md missing");
  console.log(`imagery: ${covers} detail covers, ${marks.length} brand marks on home, ${rasters} raster files (covers ${fmt(coverBytes)} B)`);
}

// ── result ───────────────────────────────────────────────────────────────────────────────────
for (const w of warns) console.warn(`WARN ${w}`);
if (fails.length) {
  console.error(`verify-uplift FAIL — ${fails.length} problem(s):`);
  for (const f of fails.slice(0, 60)) console.error("  " + f);
  process.exit(1);
}
console.log(
  `verify-uplift PASS — budgets, no external runtime requests, trade-name 0, generated assets, licences, imagery${warns.length ? ` (${warns.length} warning(s))` : ""}`,
);
