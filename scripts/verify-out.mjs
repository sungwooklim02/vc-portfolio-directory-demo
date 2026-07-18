/**
 * verify-out.mjs — mechanical checks over the exported out/ directory.
 * Fails the build if any page misses: hreflang triple (en/ko/x-default),
 * correct <html lang>, the [DEMO] badge, or the fictional-data footer notice.
 * Also asserts out/.nojekyll and out/404.html exist.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "out");

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "_next") continue;
      yield* htmlFiles(p);
    } else if (name.endsWith(".html")) {
      yield p;
    }
  }
}

const problems = [];
let pages = 0;

if (!existsSync(join(OUT, ".nojekyll"))) problems.push("out/.nojekyll missing");
if (!existsSync(join(OUT, "404.html"))) problems.push("out/404.html missing");
if (!existsSync(join(OUT, "sitemap.xml"))) problems.push("out/sitemap.xml missing");
if (!existsSync(join(OUT, "robots.txt"))) problems.push("out/robots.txt missing");

for (const file of htmlFiles(OUT)) {
  const rel = relative(OUT, file).split(sep).join("/");
  if (rel === "404.html") continue; // bilingual standalone page (what GitHub Pages serves)
  if (rel === "404/index.html") continue; // Next default not-found artifact, unused on Pages
  pages++;
  const html = readFileSync(file, "utf8");
  const isKo = rel === "ko/index.html" || rel.startsWith("ko/");

  // React serializes the attribute as hrefLang= (HTML attribute names are case-insensitive)
  for (const need of [/hreflang="en"/i, /hreflang="ko"/i, /hreflang="x-default"/i]) {
    if (!need.test(html)) problems.push(`${rel}: missing ${need}`);
  }
  const wantLang = isKo ? '<html lang="ko"' : '<html lang="en"';
  if (!html.includes(wantLang)) problems.push(`${rel}: missing ${wantLang}`);
  if (!html.includes("data-demo-badge")) problems.push(`${rel}: missing [DEMO] badge`);
  const notice = isKo ? "모든 기업·브랜드·로고·인물·데이터는 가상" : "is fictional. Not a client deliverable";
  if (!html.includes(notice)) problems.push(`${rel}: missing footer demo notice`);
  const ogLocale = isKo ? "ko_KR" : "en_US";
  if (!html.includes(ogLocale)) problems.push(`${rel}: missing og:locale ${ogLocale}`);
}

console.log(`verified ${pages} HTML pages (+404.html)`);
if (problems.length > 0) {
  console.error(`FAIL — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error("  " + p);
  process.exit(1);
}
console.log("PASS — hreflang x3, lang attr, DEMO badge, footer notice, og:locale on every page");
