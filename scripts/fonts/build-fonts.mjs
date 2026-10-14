/**
 * build-fonts.mjs — self-hosted webfont, split by script so each page downloads only what it renders.
 *
 * Source: scripts/fonts/src/PretendardVariable.woff2 (Pretendard 1.3.9, internal "Version 1.309",
 * SIL OFL 1.1). The source file is not served; only the subsets below are.
 *
 * Four chunks, all keeping the variable weight axis (the CSS uses 400–760 in-between weights):
 *   latin    ASCII + Latin-1 + every other non-Hangul character used by the site source/data
 *   kr-en    Hangul that appears on English pages (the EN dictionary in lib/i18n.ts)
 *   kr-site  every other Hangul syllable used by the site + compatibility jamo (search typing)
 *   kr-rest  the rest of KS X 1001 Hangul (2,350 common syllables) — fetched only if typed
 * Each @font-face uses a code-point-list unicode-range, so browsers fetch a chunk only when a
 * character from it is on screen.
 *
 * The chunks are modified versions of an OFL font, so their internal family name is rewritten to
 * "Renewal Sans" (scripts/fonts/sfnt-name.mjs). File names carry a content hash, so they can be
 * served with an immutable cache header.
 *
 * Outputs (gitignored, rebuilt on every build):
 *   public/fonts/rs-<chunk>-<hash>.woff2
 *   app/fonts.generated.css      @font-face rules (imported by both root layouts)
 *   lib/fonts.generated.ts       preload hrefs + chunk table (used by the root layouts)
 *   scripts/fonts/last-build.json chunk table for scripts/verify-uplift.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { hasTable, renameFamily, reservedNameLeft } from "./sfnt-name.mjs";

const require = createRequire(import.meta.url);
const subsetFont = require("subset-font");
const fontverter = require("fontverter");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "scripts", "fonts", "src", "PretendardVariable.woff2");
const KSX = join(ROOT, "scripts", "fonts", "ksx1001-hangul.txt");
const OUT_DIR = join(ROOT, "public", "fonts");
const CSS_OUT = join(ROOT, "app", "fonts.generated.css");
const TS_OUT = join(ROOT, "lib", "fonts.generated.ts");
export const MANIFEST = join(ROOT, "scripts", "fonts", "last-build.json");
const BASE = "/vc-portfolio-directory-demo";
const FAMILY = "Renewal Sans";
const RESERVED = "Pretendard";

const isHangul = (c) => {
  const cp = c.codePointAt(0);
  return cp >= 0xac00 && cp <= 0xd7a3;
};
const isJamo = (c) => {
  const cp = c.codePointAt(0);
  return (cp >= 0x3130 && cp <= 0x318f) || (cp >= 0x1100 && cp <= 0x11ff);
};
const isCjkOrPrivate = (c) => {
  const cp = c.codePointAt(0);
  return (cp >= 0x2e80 && cp <= 0x9fff) || (cp >= 0xe000 && cp <= 0xf8ff) || cp > 0xffff;
};

/** Every character in the site's source and data (what can end up on a page). */
function siteChars() {
  const chars = new Set();
  const scanDirs = ["app", "components", "lib", "data"];
  const exts = new Set([".ts", ".tsx", ".json", ".mjs", ".js", ".css"]);
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (exts.has(extname(n)) && !n.includes(".generated.")) for (const ch of readFileSync(p, "utf8")) chars.add(ch);
    }
  };
  for (const d of scanDirs) walk(join(ROOT, d));
  for (const ch of readFileSync(join(ROOT, "scripts", "post-export.mjs"), "utf8")) chars.add(ch);
  return chars;
}

/** Hangul in the EN dictionary (lib/i18n.ts, between `const en` and `const ko`). */
function enPageHangul() {
  const src = readFileSync(join(ROOT, "lib", "i18n.ts"), "utf8");
  const start = src.indexOf("const en");
  const end = src.indexOf("const ko");
  if (start < 0 || end < 0) throw new Error("lib/i18n.ts: could not find the en/ko dictionaries");
  return new Set([...src.slice(start, end)].filter(isHangul));
}

/** "U+AC00-AC02, U+AC05" from a code point list (consecutive runs merged). */
function unicodeRange(codepoints) {
  const cps = [...new Set(codepoints)].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < cps.length; i++) {
    let j = i;
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++;
    const a = cps[i].toString(16).toUpperCase();
    const b = cps[j].toString(16).toUpperCase();
    parts.push(i === j ? `U+${a}` : `U+${a}-${b}`);
    i = j;
  }
  return parts.join(",");
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`missing font source ${relative(ROOT, SRC)}`);
  const src = readFileSync(SRC);
  const srcHash = createHash("sha256").update(src).digest("hex");

  const all = siteChars();
  const ksx = [...readFileSync(KSX, "utf8").trim()];
  if (ksx.length !== 2350) throw new Error(`KS X 1001 list must have 2,350 syllables, got ${ksx.length}`);

  const latin = new Set();
  for (let c = 0x20; c <= 0x7e; c++) latin.add(String.fromCharCode(c));
  for (let c = 0xa0; c <= 0xff; c++) latin.add(String.fromCharCode(c));
  for (const ch of "–—‘’“”…·•→←↑↓×₩™©●") latin.add(ch);
  for (const ch of all) {
    if (ch.codePointAt(0) < 0x20 || isHangul(ch) || isJamo(ch) || isCjkOrPrivate(ch)) continue;
    latin.add(ch);
  }
  const krEn = enPageHangul();
  const krSite = new Set([...all].filter((c) => isHangul(c) && !krEn.has(c)));
  for (let c = 0x3131; c <= 0x3163; c++) krSite.add(String.fromCharCode(c));
  const used = new Set([...krEn, ...krSite]);
  const krRest = new Set(ksx.filter((c) => !used.has(c)));

  const chunks = [
    { id: "latin", chars: latin },
    { id: "kr-en", chars: krEn },
    { id: "kr-site", chars: krSite },
    { id: "kr-rest", chars: krRest },
  ];

  mkdirSync(OUT_DIR, { recursive: true });
  for (const n of readdirSync(OUT_DIR)) if (/^rs-.*\.woff2$/.test(n)) unlinkSync(join(OUT_DIR, n));

  const table = [];
  for (const chunk of chunks) {
    const text = [...chunk.chars].join("");
    const sfnt = await subsetFont(src, text, { targetFormat: "sfnt" });
    if (!hasTable(sfnt, "fvar")) throw new Error(`${chunk.id}: variable axis was dropped`);
    const renamed = renameFamily(sfnt, { from: RESERVED, family: FAMILY, psFamily: "RenewalSans", uniqueSuffix: chunk.id });
    const left = reservedNameLeft(renamed, RESERVED);
    if (left.length) throw new Error(`${chunk.id}: reserved font name still present in name IDs ${left.map((r) => r.nid).join(",")}`);
    const woff2 = await fontverter.convert(renamed, "woff2");
    const hash = createHash("sha256").update(woff2).digest("hex").slice(0, 10);
    const file = `rs-${chunk.id}-${hash}.woff2`;
    writeFileSync(join(OUT_DIR, file), woff2);
    table.push({
      id: chunk.id,
      file,
      href: `${BASE}/fonts/${file}`,
      bytes: woff2.length,
      chars: chunk.chars.size,
      range: unicodeRange([...chunk.chars].map((c) => c.codePointAt(0))),
    });
    console.log(`  font ${chunk.id.padEnd(8)} ${String(chunk.chars.size).padStart(5)} chars  ${String(woff2.length).padStart(8)} B  ${file}`);
  }

  // Declaration order does not matter (ranges are disjoint); weight axis kept 45–920 as in the source.
  const css =
    `/* GENERATED by scripts/fonts/build-fonts.mjs — do not edit. Source: Pretendard 1.3.9 (OFL-1.1),\n` +
    `   subset + renamed to "${FAMILY}" (modified version, see public/fonts/FONT-LICENSES.md). */\n` +
    table
      .map(
        (c) =>
          `@font-face{font-family:'${FAMILY}';src:url('${c.href}') format('woff2');font-weight:45 920;font-style:normal;font-display:swap;unicode-range:${c.range}}`,
      )
      .join("\n") +
    "\n";
  writeFileSync(CSS_OUT, css, "utf8");

  const byId = Object.fromEntries(table.map((c) => [c.id, c]));
  const ts =
    `// GENERATED by scripts/fonts/build-fonts.mjs — do not edit.\n` +
    `export const FONT_SOURCE_SHA256 = ${JSON.stringify(srcHash)};\n` +
    `export const FONT_CHUNKS = ${JSON.stringify(
      table.map(({ id, file, href, bytes, chars }) => ({ id, file, href, bytes, chars })),
      null,
      2,
    )} as const;\n` +
    `/** Faces every page paints above the fold: EN = Latin; KO = Latin + the site Hangul. */\n` +
    `export const FONT_PRELOAD = {\n  en: [${JSON.stringify(byId.latin.href)}],\n  ko: [${JSON.stringify(byId.latin.href)}, ${JSON.stringify(byId["kr-site"].href)}],\n} as const;\n`;
  writeFileSync(TS_OUT, ts, "utf8");
  writeFileSync(
    MANIFEST,
    JSON.stringify({ source: relative(ROOT, SRC).split("\\").join("/"), sourceSha256: srcHash, chunks: table.map(({ range, ...c }) => c) }, null, 2) + "\n",
  );
  console.log(`  font css ${Buffer.byteLength(css)} B -> ${relative(ROOT, CSS_OUT)}`);
}

await main();
