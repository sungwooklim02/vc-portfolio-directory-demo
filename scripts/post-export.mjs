/**
 * post-export.mjs — runs after `next build` (static export).
 * 1. Guarantees out/.nojekyll exists (GitHub Pages must not run Jekyll,
 *    otherwise every _next/ asset 404s).
 * 2. Writes a bilingual 404.html (GitHub Pages serves exactly one 404 file,
 *    so EN and KO share the page).
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "out");
const BASE = "/vc-portfolio-directory-demo";

if (!existsSync(OUT)) {
  console.error("out/ not found — run next build first");
  process.exit(1);
}

// 1. .nojekyll
const nojekyll = join(OUT, ".nojekyll");
if (!existsSync(nojekyll)) {
  writeFileSync(nojekyll, "");
  console.log("wrote out/.nojekyll (was missing)");
} else {
  console.log("out/.nojekyll present");
}

// 2. bilingual 404
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>404 — Page not found · Velmara Ventures [DEMO]</title>
<link rel="icon" href="${BASE}/favicon.svg">
<style>
  :root { color-scheme: light; }
  html.dark { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
      Arial, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;
    background: #fafafa; color: #18181b; padding: 24px;
  }
  html.dark body { background: #09090b; color: #f4f4f5; }
  main { max-width: 26rem; text-align: center; }
  .badge {
    display: inline-block; border: 1px solid rgba(217,119,6,.5); background: #fffbeb; color: #b45309;
    border-radius: 999px; padding: 2px 10px; font-size: 10px; font-weight: 700; letter-spacing: .12em;
  }
  html.dark .badge { background: #451a03; color: #fbbf24; border-color: rgba(245,158,11,.4); }
  h1 { font-size: 3rem; margin: 16px 0 4px; letter-spacing: -0.03em; }
  p { margin: 6px 0; font-size: 14px; line-height: 1.6; color: #52525b; }
  html.dark p { color: #a1a1aa; }
  a { color: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
  .links { margin-top: 20px; display: flex; gap: 16px; justify-content: center; font-size: 14px; }
</style>
<script>(function(){try{var s=localStorage.getItem("vpd-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})();</script>
</head>
<body>
<main>
  <span class="badge">DEMO</span>
  <h1>404</h1>
  <p>This page does not exist.</p>
  <p lang="ko">존재하지 않는 페이지입니다.</p>
  <nav class="links" aria-label="404 navigation">
    <a href="${BASE}/">English home</a>
    <a href="${BASE}/ko/" lang="ko">한국어 홈</a>
  </nav>
</main>
</body>
</html>
`;
writeFileSync(join(OUT, "404.html"), html, "utf8");
console.log("wrote out/404.html (bilingual)");
