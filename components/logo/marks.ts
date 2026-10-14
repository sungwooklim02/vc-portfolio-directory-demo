/**
 * Hand-authored abstract brand marks for the 80 FICTIONAL portfolio companies.
 *
 * Original vector work made for this demo (no third-party logos, no logo kits). Every mark sits on a
 * 24×24 grid and uses two tones: tone 0 = the full brand colour, tone 1 = a lighter tint of it, which
 * gives each mark the duotone look of a real identity system. Marks that read as a well-known company's
 * logo (two overlapping circles, four-point sparkle, bird, apple, swoosh …) were deliberately left out.
 */
export type MarkShape =
  | { k: "path"; d: string; tone: 0 | 1; evenOdd?: boolean }
  | { k: "circle"; cx: number; cy: number; r: number; tone: 0 | 1 }
  | { k: "rect"; x: number; y: number; w: number; h: number; rx?: number; tone: 0 | 1 };

const p = (d: string, tone: 0 | 1 = 0, evenOdd = false): MarkShape => ({ k: "path", d, tone, evenOdd });
const c = (cx: number, cy: number, r: number, tone: 0 | 1 = 0): MarkShape => ({ k: "circle", cx, cy, r, tone });
const r = (x: number, y: number, w: number, h: number, rx = 0, tone: 0 | 1 = 0): MarkShape => ({ k: "rect", x, y, w, h, rx, tone });

export const MARKS: MarkShape[][] = [
  // 0 split disc
  [p("M12 3a9 9 0 0 0 0 18z"), p("M12 3a9 9 0 0 1 0 18z", 1)],
  // 1 stacked chevrons
  [p("M4 12.6 12 5.6l8 7-2.6 2.3L12 10.2l-5.4 4.7z"), p("M4 18.2l8-7 8 7-2.6 2.3L12 15.8l-5.4 4.7z", 1)],
  // 2 offset squares
  [r(3.5, 3.5, 11, 11, 2.5, 1), r(9.5, 9.5, 11, 11, 2.5, 0)],
  // 3 leaf
  [p("M4.5 19.5C4.5 10.6 10.6 4.5 19.5 4.5c0 8.9-6.1 15-15 15z"), p("M5.6 20.1 3.9 18.4l9.6-9.6 1.7 1.7z", 1)],
  // 4 hex node
  [p("M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z", 1), c(12, 12, 3.6, 0)],
  // 5 offset half-discs (fix round p2: replaces a double wave that read as an "approx" sign)
  [p("M3 11a6 6 0 0 1 12 0z"), p("M9 13h12a6 6 0 0 1-12 0z", 1)],
  // 6 arc pair
  [p("M3 12a9 9 0 0 1 9-9v4a5 5 0 0 0-5 5z"), p("M21 12a9 9 0 0 1-9 9v-4a5 5 0 0 0 5-5z", 1)],
  // 7 notched tile
  [p("M4 4h16v10l-6 6H4z"), p("M16.2 20 20 16.2V20z", 1)],
  // 8 prism
  [p("M12 3 3 19.5h9z"), p("M12 3l9 16.5h-9z", 1)],
  // 9 diamond cluster
  [p("M12 2.8l4.2 4.2-4.2 4.2L7.8 7z"), p("M7 7.8l4.2 4.2L7 16.2 2.8 12z", 1), p("M17 7.8l4.2 4.2-4.2 4.2-4.2-4.2z", 1), p("M12 12.8l4.2 4.2-4.2 4.2L7.8 17z")],
  // 10 notched disc + block (fix round p2: replaces a "halo" ring that read as a radio-button / target icon)
  [p("M12 3a9 9 0 1 0 9 9h-9z"), r(14.2, 3, 6.8, 6.8, 1.6, 1)],
  // 11 interlocked corners (fix round p2: replaces "rising bars", which read as a chart / signal icon)
  [p("M3.5 3.5h5v12h12v5h-17z"), p("M20.5 3.5v10h-5V8.5h-5v-5z", 1)],
  // 12 three pills
  [r(3.5, 7, 4.5, 10, 2.25, 1), r(9.75, 3, 4.5, 18, 2.25, 0), r(16, 7, 4.5, 10, 2.25, 1)],
  // 13 pinwheel quarters
  [p("M12 12V3a9 9 0 0 1 9 9z"), p("M12 12v9a9 9 0 0 1-9-9z", 1), p("M12 12H6a6 6 0 0 1 6-6z", 1), p("M12 12h6a6 6 0 0 1-6 6z")],
  // 14 slanted blocks
  [p("M9.2 3h7.6L10.8 21H3.2z"), p("M17.4 7.5h3.4L16.6 21h-3.4z", 1)],
  // 15 orbit + moon
  [p("M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zm0 2.6a6.4 6.4 0 1 1 0 12.8 6.4 6.4 0 1 1 0-12.8z", 1, true), c(16.6, 7.4, 3.2, 0)],
  // 16 stacked planes
  [p("M12 3.5l9 4.6-9 4.6-9-4.6z"), p("M3 12.2l9 4.6 9-4.6v3.2l-9 4.6-9-4.6z", 1)],
  // 17 framed cross
  [p("M9 3h6v6h6v6h-6v6H9v-6H3V9h6z", 1), r(9, 9, 6, 6, 0, 0)],
  // 18 drop
  [p("M12 2.8c4.2 5 7 8.6 7 12.2a7 7 0 0 1-14 0c0-3.6 2.8-7.2 7-12.2z"), p("M12 20.2a5.2 5.2 0 0 0 5.2-5.2h-2.6a2.6 2.6 0 0 1-2.6 2.6z", 1)],
  // 19 rising steps
  [r(3.5, 14, 6.5, 6.5, 1.5, 1), r(8.75, 8.75, 6.5, 6.5, 1.5, 0), r(14, 3.5, 6.5, 6.5, 1.5, 0)],
  // 20 diagonal dots
  [c(6, 18, 3, 1), c(12, 12, 3, 0), c(18, 6, 3, 0)],
  // 21 sunrise
  [p("M3 13a9 9 0 0 1 18 0z"), p("M6.5 20a5.5 5.5 0 0 1 11 0z", 1)],
  // 22 brackets
  [p("M4 4h7v3H7v10h4v3H4z"), p("M20 4h-7v3h4v10h-4v3h7z", 1)],
  // 23 keyhole tile
  [r(3.5, 3.5, 17, 17, 5, 1), c(12, 10.4, 3.2, 0), p("M10.4 12.6h3.2l1 5.2H9.4z")],
];

/**
 * Brand colours per sector — deeper, saturated tones (not pastels). Each entry is
 * [base, tint, light-for-dark-mode]. Companies pick one of the three shades of their sector.
 */
export const SECTOR_COLOURS: Record<string, Array<[string, string, string]>> = {
  fintech: [["#0f6e74", "#7fc6c9", "#5cc3c9"], ["#11585e", "#8dbfc2", "#6fbcc1"], ["#1c7f6a", "#93d3c3", "#6fd0b6"]],
  saas: [["#2c5fa8", "#9cbbe6", "#86aef0"], ["#244e8c", "#a3b9db", "#8fb0e6"], ["#3b6fc0", "#adc6ef", "#94b8f5"]],
  ai: [["#5b3f9e", "#bcaee3", "#b39ff0"], ["#3f3a8f", "#aeaadf", "#a29ef0"], ["#7a3f8f", "#d3aee0", "#d09ce6"]],
  health: [["#c4473a", "#f0b0a8", "#f08e82"], ["#b23a5a", "#ecaabd", "#f08aa8"], ["#d0573a", "#f3bba8", "#f59a7f"]],
  consumer: [["#c97a10", "#f1cc8f", "#f2b44f"], ["#b85c1c", "#ecbd98", "#f09a5c"], ["#a8781a", "#e8d09a", "#e8bf5c"]],
  climate: [["#3d7f2f", "#a9d39c", "#8fd27c"], ["#2f6b4f", "#9fcbb5", "#7fcca6"], ["#5a7d1c", "#c2d896", "#b2d86a"]],
  logistics: [["#1d4e89", "#9db7d8", "#7fa9e0"], ["#24607a", "#a0c3d3", "#7cbcd8"], ["#334e7a", "#a9b8d3", "#93acdb"]],
  deeptech: [["#2f3a4f", "#a8b1c2", "#b4bfd4"], ["#40485c", "#b3b9c7", "#c0c7d6"], ["#2e4a5c", "#a3b9c6", "#9fc2d6"]],
};
