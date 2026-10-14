/**
 * Runtime view of the design tokens in app/globals.css (:root / .dark). The three.js orbit, the ECharts
 * map and charts, and the sector legend all paint from here, so a library never shows its default skin.
 * watchTheme() re-runs a callback when <html class="dark"> flips (the theme toggle), synchronously, so a
 * View Transition snapshot already carries the new colours.
 */
export interface Palette {
  dark: boolean;
  ink: string;
  ink2: string;
  ink3: string;
  page: string;
  surface: string;
  surface2: string;
  line: string;
  line2: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  hero: string;
  land: string;
  landLine: string;
  sea: string;
  orbitCore: string;
  orbitGlow: string;
  orbitHull: string;
  orbitRing: string;
  orbitDim: string;
  orbitDot: string;
  sectors: string[];
  font: string;
}

const FALLBACK_SECTORS = ["#2f6b4f", "#5b7fa6", "#7aa86b", "#b5644f", "#c08a3e", "#3f9b8f", "#8a6bb0", "#4f6e8a"];

export function readPalette(): Palette {
  const el = document.documentElement;
  const cs = getComputedStyle(el);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    dark: el.classList.contains("dark"),
    ink: v("--vpd-ink", "#131821"),
    ink2: v("--vpd-ink-2", "#516759"),
    ink3: v("--vpd-ink-3", "#6a796e"),
    page: v("--vpd-page", "#f7f8fa"),
    surface: v("--vpd-surface", "#ffffff"),
    surface2: v("--vpd-surface-2", "#f3f6f0"),
    line: v("--vpd-line", "#e3e8e1"),
    line2: v("--vpd-line-2", "#cfd9cc"),
    accent: v("--vpd-accent", "#52785e"),
    accentStrong: v("--vpd-accent-strong", "#294d35"),
    accentSoft: v("--vpd-accent-soft", "#e4ede3"),
    hero: v("--vpd-hero", "#eaf0eb"),
    land: v("--vpd-land", "#dfe7dd"),
    landLine: v("--vpd-land-line", "#c3cfc1"),
    sea: v("--vpd-sea", "#f1f5f0"),
    orbitCore: v("--vpd-orbit-core", "#a8c99f"),
    orbitGlow: v("--vpd-orbit-glow", "#1d3324"),
    orbitHull: v("--vpd-orbit-hull", "#5d7f68"),
    orbitRing: v("--vpd-orbit-ring", "#71957f"),
    orbitDim: v("--vpd-orbit-dim", "#c9d3c6"),
    orbitDot: v("--vpd-orbit-dot", "#e9f1de"),
    sectors: FALLBACK_SECTORS.map((fb, i) => v(`--vpd-sector-${i + 1}`, fb)),
    font: v("--font-sans", "'Renewal Sans', system-ui, sans-serif"),
  };
}

/** Call cb whenever the theme class on <html> changes. Returns an unsubscribe function. */
export function watchTheme(cb: (p: Palette) => void): () => void {
  const el = document.documentElement;
  let dark = el.classList.contains("dark");
  const mo = new MutationObserver(() => {
    const now = el.classList.contains("dark");
    if (now === dark) return;
    dark = now;
    cb(readPalette());
  });
  mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
