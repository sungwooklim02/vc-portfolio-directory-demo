/**
 * firm-mark.mjs — the one source of the (fictional) firm's "V." mark. Original artwork for this demo.
 * Used by components/FirmMark.tsx (header) and scripts/build-assets.mjs (writes public/favicon.svg),
 * in the same green family as the hero orbit's "V." sphere.
 */
export const FIRM_MARK = {
  viewBox: "0 0 48 48",
  tile: { rx: 12, light: "#294d35", dark: "#a3c991" },
  v: { d: "M12.5 13.5 L22 34.5 L31.5 13.5", light: "#f4f8f1", dark: "#19231b", width: 5.2 },
  dot: { cx: 36.2, cy: 32.4, r: 3.6, light: "#a3c991", dark: "#294d35" },
};

/** Standalone SVG (favicon): light tile, with a dark-scheme override for browser tabs in dark UI. */
export function firmMarkSvg() {
  const m = FIRM_MARK;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${m.viewBox}">
  <style>.t{fill:${m.tile.light}}.v{stroke:${m.v.light}}.d{fill:${m.dot.light}}@media (prefers-color-scheme:dark){.t{fill:${m.tile.dark}}.v{stroke:${m.v.dark}}.d{fill:${m.dot.dark}}}</style>
  <rect class="t" width="48" height="48" rx="${m.tile.rx}"/>
  <path class="v" d="${m.v.d}" fill="none" stroke-width="${m.v.width}" stroke-linecap="round" stroke-linejoin="round"/>
  <circle class="d" cx="${m.dot.cx}" cy="${m.dot.cy}" r="${m.dot.r}"/>
</svg>
`;
}
