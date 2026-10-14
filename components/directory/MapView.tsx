"use client";

/**
 * Directory "Map" view (a view of the home directory, not a new route).
 *  - World map from the local world-atlas TopoJSON (no tile server, no geocoding), one bubble per HQ city
 *    sized by how many companies match the other filters; selecting a city toggles the city filter.
 *  - Region presets and +/- move the camera with easing; drag moves the map; the wheel is left to the page.
 *  - Below: companies-by-sector bars (select = sector filter) and a founding-year histogram with a range
 *    slider (from/to). Every view reads and writes the same directory state, so the grid, the hero orbit,
 *    the map and the charts always agree.
 * Apache ECharts (SVG renderer) is loaded on first entry with the geodata; until then a map-shaped
 * skeleton and a loading line are shown (real network wait, not a fake delay).
 * Floors: with reduced motion / capture-mode every chart renders its final state without animation and the
 * selected city uses a static marker instead of the ripple.
 */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, Icons, SectorIcon } from "@/components/icons";
import { Logo } from "@/components/Logo";
import type { CardData, CityOption, RegionId } from "@/lib/companies";
import type { DirState } from "@/lib/dirState";
import { t, type Locale } from "@/lib/i18n";
import { loadVendor, VENDOR } from "@/lib/loadScript";
import { motionOff } from "@/lib/mk";
import { readPalette, watchTheme, type Palette } from "@/lib/palette";
import { withBase } from "@/lib/site";

/* minimal structural types for the vendored ECharts build (global ECHARTS_LITE) */
interface Chart {
  setOption(opt: unknown, opts?: { notMerge?: boolean; lazyUpdate?: boolean; replaceMerge?: string[] }): void;
  on(ev: string, cb: (p: { seriesType?: string; componentType?: string; name?: string; dataIndex?: number; data?: unknown }) => void): void;
  resize(): void;
  dispose(): void;
  getWidth(): number;
  getHeight(): number;
  convertToPixel(finder: { geoIndex: number }, value: number[]): number[];
  getOption(): { geo?: Array<{ center?: [number, number]; zoom?: number }> };
}
interface EchartsLite {
  init(el: HTMLElement, theme?: unknown, opts?: { renderer?: "svg" | "canvas"; locale?: string }): Chart;
  registerMap(name: string, geo: unknown): void;
  getMap(name: string): unknown;
  feature(topo: unknown, obj: unknown): unknown;
}

type Camera = { center: [number, number]; zoom: number };
const REGIONS: Array<{ id: "all" | "apac" | "europe" | "na"; cam: Camera; covers: RegionId[] }> = [
  { id: "all", cam: { center: [12, 22], zoom: 1.12 }, covers: ["asia", "apac", "europe", "na"] },
  // framed so Seoul/Tokyo (37.6N) and Sydney (33.9S) both sit inside with room for bubble + label
  { id: "apac", cam: { center: [127, 2], zoom: 1.85 }, covers: ["asia", "apac"] },
  { id: "europe", cam: { center: [12, 54], zoom: 4.6 }, covers: ["europe"] },
  { id: "na", cam: { center: [-95, 39], zoom: 3.1 }, covers: ["na"] },
];
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
/* below this map width (phones) the whole world is shown unzoomed and the bubbles shrink, so every city
   bubble and label stays inside the frame */
const NARROW = 560;
const NARROW_ALL: Camera = { center: [10, 14], zoom: 1 };
const camFor = (id: (typeof REGIONS)[number]["id"], narrow: boolean): Camera =>
  id === "all" && narrow ? NARROW_ALL : (REGIONS.find((r) => r.id === id) ?? REGIONS[0]).cam;

type LabelItem = { name: string; value: number[]; cityLabel: string; gap: number };
type Bubble = { value: number[]; symbolSize: number };
type LabelPos = "right" | "left" | "top" | "bottom";
let measureCtx: CanvasRenderingContext2D | null | undefined;
const textWidth = (text: string, font: string) => {
  if (measureCtx === undefined) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * 7;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
};
/**
 * Picks a side (right, left, top, bottom) for every city label so that it covers no neighbouring bubble,
 * no label placed before it and stays inside the frame. Bigger cities choose first. Positions are in pixels
 * of the current camera, so this runs after every paint and camera move. A label with no clear side (dense
 * clusters on a small map) is not drawn - its city keeps the bubble, the tooltip and its row in the list.
 */
function placeLabels(labels: LabelItem[], bubbles: Bubble[], toPx: (lonLat: number[]) => number[] | undefined, w: number, h: number, font: string, size: number): Map<string, LabelPos | null> {
  type Box = { x: number; y: number; w: number; h: number };
  const area = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const outside = (a: Box) => a.w * a.h - area(a, { x: 2, y: 2, w: w - 4, h: h - 4 });
  const discs = bubbles
    .map((b) => {
      const pt = toPx(b.value);
      const r = b.symbolSize / 2;
      return pt ? { x: pt[0] - r, y: pt[1] - r, w: r * 2, h: r * 2, cx: pt[0], cy: pt[1] } : null;
    })
    .filter((d): d is NonNullable<typeof d> => !!d);
  const placed: Box[] = [];
  const out = new Map<string, LabelPos | null>();
  const CLEAR = 24; // tolerated overlap score (a few px of a box corner touching a neighbour)
  const lh = size + 4;
  for (const l of [...labels].sort((a, b) => b.value[2] - a.value[2])) {
    const pt = toPx(l.value);
    if (!pt) continue;
    const [x, y] = pt;
    const tw = textWidth(l.cityLabel, `600 ${size}px ${font}`) + 4;
    const g = l.gap;
    const cands: Array<[LabelPos, Box]> = [
      ["right", { x: x + g, y: y - lh / 2, w: tw, h: lh }],
      ["left", { x: x - g - tw, y: y - lh / 2, w: tw, h: lh }],
      ["top", { x: x - tw / 2, y: y - g - lh, w: tw, h: lh }],
      ["bottom", { x: x - tw / 2, y: y + g, w: tw, h: lh }],
    ];
    let best = cands[0];
    let bestScore = Infinity;
    for (const c of cands) {
      let score = outside(c[1]) * 50;
      for (const d of discs) if (Math.abs(d.cx - x) > 0.5 || Math.abs(d.cy - y) > 0.5) score += area(c[1], d) * 4;
      for (const p of placed) score += area(c[1], p) * 6;
      if (score < bestScore - 0.5) {
        best = c;
        bestScore = score;
      }
    }
    if (bestScore > CLEAR) {
      out.set(l.name, null);
      continue;
    }
    placed.push(best[1]);
    out.set(l.name, best[0]);
  }
  return out;
}

type Ring = number[][];
type GeoFC = { features: Array<{ geometry: { type: string; coordinates: unknown } | null }> };
/**
 * world-atlas keeps the outlines of Russia and Fiji as single rings that jump from +180 to -180 longitude.
 * A flat (equirectangular) projection draws that jump as a line across the whole map, so such rings are
 * cut at the antimeridian into one piece per side (each closed along the +-180 meridian). Rings with an odd
 * number of jumps (the polar ring of Antarctica, which is hidden anyway) are left as they are.
 */
function splitAntimeridian(fc: GeoFC): GeoFC {
  const splitRing = (ring: Ring): Ring[] | null => {
    const open = ring.slice(0, -1);
    const n = open.length;
    const jumps: number[] = [];
    for (let i = 0; i < n; i++) if (Math.abs(open[i][0] - open[(i + n - 1) % n][0]) > 180) jumps.push(i);
    if (jumps.length === 0 || jumps.length % 2 === 1) return null;
    const pieces: Ring[] = [];
    let cur: Ring = [];
    for (let k = 0; k < n; k++) {
      const i = (jumps[0] + k) % n;
      if (k > 0 && jumps.includes(i)) {
        pieces.push(cur);
        cur = [];
      }
      cur.push(open[i]);
    }
    pieces.push(cur);
    return pieces.filter((pc) => pc.length >= 3).map((pc) => [...pc, pc[0]]);
  };
  for (const f of fc.features) {
    const g = f.geometry;
    if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) continue;
    const polys = (g.type === "Polygon" ? [g.coordinates] : g.coordinates) as Ring[][];
    let changed = false;
    const out: Ring[][] = [];
    for (const poly of polys) {
      const pieces = splitRing(poly[0]);
      if (!pieces) out.push(poly);
      else {
        changed = true;
        for (const piece of pieces) out.push([piece]);
      }
    }
    if (changed) f.geometry = { type: "MultiPolygon", coordinates: out };
  }
  return fc;
}

interface Props {
  locale: Locale;
  filtered: CardData[];
  sectors: Array<{ id: string; label: string }>;
  cities: CityOption[];
  state: DirState;
  years: [number, number];
  cityCounts: Map<string, number>;
  sectorCounts: Map<string, number>;
  yearCounts: Map<string, number>;
  onCity: (id: string) => void;
  onSector: (id: string) => void;
  onYears: (from: number, to: number) => void;
  onClear: () => void;
}

const esc = (x: string) => x.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function MapView(p: Props) {
  const { locale, filtered, sectors, cities, state, years, cityCounts, sectorCounts, yearCounts } = p;
  const s = t(locale);
  const mapEl = useRef<HTMLDivElement>(null);
  const barEl = useRef<HTMLDivElement>(null);
  const histEl = useRef<HTMLDivElement>(null);
  const charts = useRef<{ map: Chart; bar: Chart; hist: Chart } | null>(null);
  const cam = useRef<Camera>(REGIONS[0].cam);
  const tween = useRef(0);
  const handlers = useRef(p);
  handlers.current = p;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [region, setRegion] = useState<(typeof REGIONS)[number]["id"]>("all");
  const [palette, setPalette] = useState<Palette | null>(null);
  const [narrow, setNarrow] = useState(false);
  const narrowSeen = useRef<boolean | null>(null);
  const labelSrc = useRef<{ labels: LabelItem[]; bubbles: Bubble[]; font: string; size: number } | null>(null);
  const labelRaf = useRef(0);
  /* re-place the city labels for the current camera (after a paint, a camera move or a drag) */
  const relabel = () => {
    const c = charts.current;
    const src = labelSrc.current;
    if (!c || !src || !c.map.getOption().geo?.length) return;
    const toPx = (v: number[]) => {
      try {
        const r = c.map.convertToPixel({ geoIndex: 0 }, [v[0], v[1]]);
        return r && Number.isFinite(r[0]) && Number.isFinite(r[1]) ? r : undefined;
      } catch {
        return undefined;
      }
    };
    const pos = placeLabels(src.labels, src.bubbles, toPx, c.map.getWidth(), c.map.getHeight(), src.font, src.size);
    c.map.setOption({
      series: [{ id: "labels", data: src.labels.map((l) => {
        const side = pos.get(l.name);
        return { ...l, label: side ? { show: true, position: side, distance: l.gap } : { show: false } };
      }) }],
    });
  };
  const relabelSoon = () => {
    cancelAnimationFrame(labelRaf.current);
    labelRaf.current = requestAnimationFrame(relabel);
  };

  const yearList = useMemo(() => {
    const out: number[] = [];
    for (let y = years[0]; y <= years[1]; y++) out.push(y);
    return out;
  }, [years]);
  const from = state.from ?? years[0];
  const to = state.to ?? years[1];
  const byCity = useMemo(() => {
    const m = new Map<string, CardData[]>();
    for (const c of filtered) m.set(c.cityId, [...(m.get(c.cityId) ?? []), c]);
    return m;
  }, [filtered]);

  /* ── load ECharts + geodata once, create the three charts */
  useEffect(() => {
    let dead = false;
    let unwatch = () => {};
    let ro: ResizeObserver | null = null;
    Promise.all([
      loadVendor<EchartsLite>(VENDOR.echarts.file, VENDOR.echarts.global),
      fetch(withBase(`/vendor/${VENDOR.geo}`)).then((r) => {
        if (!r.ok) throw new Error(`geo ${r.status}`);
        return r.json() as Promise<{ objects: { countries: unknown } }>;
      }),
    ])
      .then(([E, topo]) => {
        if (dead || !mapEl.current || !barEl.current || !histEl.current) return;
        if (!E.getMap("world")) E.registerMap("world", splitAntimeridian(E.feature(topo, topo.objects.countries) as GeoFC));
        const map = E.init(mapEl.current, undefined, { renderer: "svg" });
        const bar = E.init(barEl.current, undefined, { renderer: "svg" });
        const hist = E.init(histEl.current, undefined, { renderer: "svg" });
        charts.current = { map, bar, hist };
        map.on("click", (e) => {
          if ((e.seriesType === "scatter" || e.seriesType === "effectScatter") && e.name) handlers.current.onCity(e.name);
        });
        map.on("georoam", () => {
          const g = map.getOption().geo?.[0];
          if (g?.center && typeof g.zoom === "number") cam.current = { center: [Number(g.center[0]), Number(g.center[1])], zoom: g.zoom };
          relabelSoon();
        });
        bar.on("click", (e) => {
          const id = (e.data as { id?: string } | undefined)?.id;
          if (id) handlers.current.onSector(id);
        });
        hist.on("click", (e) => {
          const y = Number((e.data as { year?: number } | undefined)?.year);
          if (!y) return;
          const cur = handlers.current;
          const f = cur.state.from;
          const tt = cur.state.to;
          if (f === y && tt === y) cur.onYears(cur.years[0], cur.years[1]);
          else cur.onYears(y, y);
        });
        const mapBox = mapEl.current;
        const barBox = barEl.current;
        ro = new ResizeObserver((entries) => {
          for (const en of entries) {
            const { width, height } = en.contentRect;
            // a view switch or re-layout can report a 0-width box for a moment; ECharts throws when resized
            // at 0x0, and the observer fires again with the real size, so a zero size is simply skipped
            if (width < 1 || height < 1) continue;
            const ch = en.target === mapBox ? map : en.target === barBox ? bar : hist;
            try {
              ch.resize();
            } catch {
              /* the next non-zero size repaints it */
            }
            if (ch === map) setNarrow(width < NARROW);
          }
        });
        [mapEl.current, barEl.current, histEl.current].forEach((el) => ro?.observe(el));
        const w0 = mapBox.clientWidth;
        if (w0 > 0) setNarrow(w0 < NARROW);
        unwatch = watchTheme((pal) => setPalette(pal));
        setPalette(readPalette());
        setStatus("ready");
      })
      .catch(() => {
        if (!dead) setStatus("error");
      });
    return () => {
      dead = true;
      cancelAnimationFrame(tween.current);
      cancelAnimationFrame(labelRaf.current);
      unwatch();
      ro?.disconnect();
      charts.current?.map.dispose();
      charts.current?.bar.dispose();
      charts.current?.hist.dispose();
      charts.current = null;
    };
  }, [locale]);

  /* ── phones get an unzoomed world on the "all" preset; follow the width class while that preset is active.
     Only the camera ref changes here: the paint effect below depends on `narrow` and writes the full geo
     option (map: "world" + center/zoom) right after this one. A partial setOption({ geo: { center, zoom } })
     here ran before the first paint on phones and created a geo without a map, which ECharts rejects
     (getFilledRegions of an undefined map) - that took the whole page down below 560px. */
  useEffect(() => {
    if (narrowSeen.current === narrow) return;
    narrowSeen.current = narrow;
    if (region !== "all") return;
    cancelAnimationFrame(tween.current);
    cam.current = camFor("all", narrow);
  }, [narrow, region]);

  /* ── (re)paint whenever data, selection or theme changes */
  useEffect(() => {
    const c = charts.current;
    if (!c || !palette) return;
    const still = motionOff();
    const font = palette.font;
    const tooltip = {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: palette.ink, fontFamily: font, fontSize: 12 },
      extraCssText: "border-radius:10px;box-shadow:0 10px 30px rgba(20,40,25,.14);",
      transitionDuration: still ? 0 : 0.2,
    };
    const sectorColor = (id: string) => palette.sectors[Math.max(0, sectors.findIndex((x) => x.id === id)) % palette.sectors.length];
    const maxCity = Math.max(1, ...cities.map((ct) => cityCounts.get(ct.id) ?? 0));
    const k = narrow ? 0.62 : 1;

    // map
    const cityData = cities.map((ct) => {
      const n = cityCounts.get(ct.id) ?? 0;
      const on = state.city === ct.id;
      return {
        name: ct.id,
        value: [ct.lon, ct.lat, n],
        cityLabel: ct.label, // not `label`: that key is an ECharts per-item label option
        symbolSize: n === 0 ? (narrow ? 5 : 7) : (10 + Math.sqrt(n / maxCity) * 26) * k,
        itemStyle: {
          color: n === 0 ? palette.line2 : on ? palette.accentStrong : palette.accent,
          opacity: n === 0 ? 0.7 : state.city !== "all" && !on ? 0.45 : 0.9,
          borderColor: palette.surface,
          borderWidth: 1.5,
        },
      };
    });
    const selected = cities.find((ct) => ct.id === state.city);
    // labels live in their own series drawn above every bubble; relabel() then puts each one on the side of
    // its bubble that covers no neighbouring bubble or label and stays in the frame (e.g. London to the west
    // of the Rotterdam/Berlin cluster, Seoul to the west of Tokyo), and what still collides is hidden
    const labelData = cityData
      .filter((d) => d.value[2] > 0)
      .map((d) => ({ name: d.name, value: d.value, cityLabel: d.cityLabel, gap: d.symbolSize / 2 + 4 }));
    labelSrc.current = { labels: labelData, bubbles: cityData, font, size: narrow ? 10 : 11 };
    c.map.setOption(
      {
        animation: !still,
        animationDurationUpdate: 360,
        aria: { enabled: true, label: { description: `${s.mapListLabel}: ${cities.map((ct) => `${ct.label} ${cityCounts.get(ct.id) ?? 0}`).join(", ")}. ${s.mapNote}` } },
        tooltip: {
          ...tooltip,
          trigger: "item",
          formatter: (prm: { data?: { name?: string; cityLabel?: string; value?: number[] } }) => {
            const d = prm.data;
            if (!d?.name) return "";
            const list = byCity.get(d.name) ?? [];
            const n = d.value?.[2] ?? 0;
            const names = list.slice(0, 5).map((x) => `<div style="margin-top:2px">${esc(x.name)}</div>`).join("");
            const more = list.length > 5 ? `<div style="margin-top:4px;opacity:.7">+${list.length - 5} ${esc(s.mapMore)}</div>` : "";
            return `<strong style="font-weight:700">${esc(d.cityLabel ?? "")}</strong> <span style="opacity:.7">${n} ${esc(s.mapCityCompanies)}</span>${names}${more}`;
          },
        },
        geo: {
          map: "world",
          roam: window.matchMedia("(pointer: coarse)").matches ? false : "move",
          center: cam.current.center,
          zoom: cam.current.zoom,
          scaleLimit: { min: ZOOM_MIN, max: ZOOM_MAX },
          aspectScale: 0.82,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          silent: true,
          itemStyle: { areaColor: palette.land, borderColor: palette.landLine, borderWidth: 0.6 },
          emphasis: { disabled: true },
          select: { disabled: true },
          regions: [{ name: "Antarctica", itemStyle: { opacity: 0 } }],
        },
        series: [
          {
            id: "cities",
            type: "scatter",
            coordinateSystem: "geo",
            data: cityData,
            symbolSize: (_v: unknown, prm: { data: { symbolSize: number } }) => prm.data.symbolSize,
            cursor: "pointer",
            emphasis: { scale: 1.25, itemStyle: { color: palette.accentStrong, opacity: 1 } },
            label: { show: false },
            z: 3,
          },
          {
            id: "labels",
            type: "scatter",
            coordinateSystem: "geo",
            data: labelData,
            symbolSize: 0,
            silent: true,
            tooltip: { show: false },
            label: {
              show: true,
              formatter: (prm: { data: { cityLabel: string } }) => prm.data.cityLabel,
              position: "right",
              color: palette.ink2,
              fontFamily: font,
              fontSize: narrow ? 10 : 11,
              fontWeight: 600,
              textBorderColor: palette.surface,
              textBorderWidth: 2,
            },
            // the side of each label is chosen by placeLabels() right after this paint (relabel below)
            labelLayout: { hideOverlap: true },
            animation: false,
            z: 5,
          },
          {
            id: "selected",
            type: still ? "scatter" : "effectScatter",
            coordinateSystem: "geo",
            data: selected ? [{ name: selected.id, value: [selected.lon, selected.lat, cityCounts.get(selected.id) ?? 0], cityLabel: selected.label }] : [],
            symbolSize: 14 * k,
            rippleEffect: { brushType: "stroke", scale: 3.2, period: 3 },
            itemStyle: { color: palette.accentStrong, borderColor: palette.surface, borderWidth: 2 },
            cursor: "pointer",
            z: 4,
          },
        ],
      },
      { replaceMerge: ["series"] },
    );
    relabel();

    // sector bars (counts with every condition except the sector)
    const sectorRows = [...sectors].reverse();
    c.bar.setOption(
      {
        animation: !still,
        animationDuration: 700,
        animationDurationUpdate: 420,
        animationEasingUpdate: "cubicOut",
        aria: { enabled: true, label: { description: `${s.chartSectors}: ${sectors.map((x) => `${x.label} ${sectorCounts.get(x.id) ?? 0}`).join(", ")}` } },
        textStyle: { fontFamily: font },
        grid: { left: 2, right: 34, top: 4, bottom: 4, outerBoundsMode: "same", outerBoundsContain: "axisLabel" },
        tooltip: { ...tooltip, trigger: "item", formatter: (prm: { name: string; value: number }) => `${esc(prm.name)} · <strong>${prm.value}</strong>` },
        xAxis: { type: "value", show: false, minInterval: 1, max: (v: { max: number }) => Math.max(4, v.max) },
        yAxis: {
          type: "category",
          data: sectorRows.map((x) => x.label),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: palette.ink2, fontSize: 12, fontFamily: font, margin: 10 },
        },
        series: [
          {
            type: "bar",
            barWidth: "62%",
            cursor: "pointer",
            showBackground: true,
            backgroundStyle: { color: palette.surface2, borderRadius: 6 },
            label: { show: true, position: "right", color: palette.ink2, fontFamily: font, fontSize: 11, fontWeight: 600 },
            data: sectorRows.map((x) => ({
              id: x.id,
              value: sectorCounts.get(x.id) ?? 0,
              itemStyle: {
                color: sectorColor(x.id),
                opacity: state.sector === "all" || state.sector === x.id ? 1 : 0.32,
                borderRadius: 6,
              },
            })),
          },
        ],
      },
      { replaceMerge: ["series"] },
    );

    // founding-year histogram (counts with every condition except the year range)
    c.hist.setOption(
      {
        animation: !still,
        animationDuration: 700,
        animationDurationUpdate: 420,
        animationEasingUpdate: "cubicOut",
        aria: { enabled: true, label: { description: `${s.chartYears}: ${yearList.map((y) => `${y} ${yearCounts.get(String(y)) ?? 0}`).join(", ")}` } },
        textStyle: { fontFamily: font },
        grid: { left: 4, right: 4, top: 14, bottom: 2, outerBoundsMode: "same", outerBoundsContain: "axisLabel" },
        tooltip: { ...tooltip, trigger: "item", formatter: (prm: { name: string; value: number }) => `${esc(prm.name)} · <strong>${prm.value}</strong>` },
        xAxis: {
          type: "category",
          data: yearList.map(String),
          axisLine: { lineStyle: { color: palette.line2 } },
          axisTick: { show: false },
          axisLabel: { color: palette.ink3, fontSize: 10, fontFamily: font, interval: (i: number) => i % 2 === 0 },
        },
        yAxis: { type: "value", show: false, minInterval: 1 },
        series: [
          {
            type: "bar",
            barWidth: "68%",
            cursor: "pointer",
            label: { show: true, position: "top", color: palette.ink3, fontSize: 10, fontFamily: font, formatter: (prm: { value: number }) => (prm.value ? String(prm.value) : "") },
            data: yearList.map((y) => ({
              year: y,
              value: yearCounts.get(String(y)) ?? 0,
              itemStyle: { color: y >= from && y <= to ? palette.accent : palette.line2, borderRadius: [4, 4, 0, 0] },
            })),
          },
        ],
      },
      { replaceMerge: ["series"] },
    );
  }, [palette, narrow, state.city, state.sector, from, to, cities, sectors, cityCounts, sectorCounts, yearCounts, yearList, byCity, s]);

  /* ── camera moves (presets, +/-): eased, or a single jump when motion is off */
  const moveTo = (target: Camera) => {
    const c = charts.current;
    // camera moves are partial geo options; they are only valid once the paint effect has created the geo
    if (!c || !c.map.getOption().geo?.length) return;
    cancelAnimationFrame(tween.current);
    const startCam = cam.current;
    const set = (k: Camera) => {
      cam.current = k;
      c.map.setOption({ geo: { center: k.center, zoom: k.zoom } }, { lazyUpdate: false });
    };
    if (motionOff()) {
      set(target);
      relabel();
      return;
    }
    const t0 = performance.now();
    const dur = 620;
    const ease = (x: number) => 1 - Math.pow(1 - x, 4);
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = ease(k);
      set({
        center: [startCam.center[0] + (target.center[0] - startCam.center[0]) * e, startCam.center[1] + (target.center[1] - startCam.center[1]) * e],
        zoom: startCam.zoom + (target.zoom - startCam.zoom) * e,
      });
      if (k < 1) tween.current = requestAnimationFrame(step);
      else relabel();
    };
    tween.current = requestAnimationFrame(step);
  };
  const zoomBy = (f: number) => moveTo({ center: cam.current.center, zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.current.zoom * f)) });
  const regionLabel = { all: s.regionAll, apac: s.regionApac, europe: s.regionEurope, na: s.regionNa };

  const yearsLabel = `${from}–${to}`;
  const setFrom = (v: number) => p.onYears(Math.min(v, to), to);
  const setTo = (v: number) => p.onYears(from, Math.max(v, from));
  // the "to" input sits on top; once "from" is in the right half (e.g. both handles on the last year) it is
  // raised instead, so a pointer can always reach the handle that can still move
  const pct = (y: number) => ((y - years[0]) / Math.max(1, years[1] - years[0])) * 100;

  return (
    <div className="vpd-mapview">
      <div className="vpd-map-main">
        <div className="vpd-map-bar">
          <div className="vpd-map-regions" role="group" aria-label={s.mapRegions}>
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={region === r.id}
                disabled={status !== "ready"}
                onClick={() => {
                  setRegion(r.id);
                  moveTo(camFor(r.id, narrow));
                }}
              >
                {regionLabel[r.id]}
              </button>
            ))}
          </div>
          <label className="vpd-map-city">
            <Icon icon={Icons.mapPin} />
            <span className="sr-only">{s.filterCity}</span>
            <select value={state.city} onChange={(e) => (e.target.value === "all" ? p.onCity(state.city) : p.onCity(e.target.value))}>
              <option value="all">{s.filterCity}: {s.filterAll}</option>
              {cities.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.label} ({cityCounts.get(ct.id) ?? 0})
                </option>
              ))}
            </select>
          </label>
          <div className="vpd-map-zoom">
            <button type="button" aria-label={s.zoomOut} title={s.zoomOut} disabled={status !== "ready"} onClick={() => zoomBy(1 / 1.5)}>
              <Icon icon={Icons.minus} />
            </button>
            <button type="button" aria-label={s.zoomIn} title={s.zoomIn} disabled={status !== "ready"} onClick={() => zoomBy(1.5)}>
              <Icon icon={Icons.plus} />
            </button>
          </div>
        </div>
        <div className="vpd-map-stage" data-status={status}>
          <div ref={mapEl} className="vpd-map-canvas" />
          {status === "loading" && (
            <p className="vpd-map-msg" role="status">
              <span className="vpd-spinner" aria-hidden="true" />
              {s.mapLoading}
            </p>
          )}
          {status === "error" && (
            <p className="vpd-map-msg is-error" role="alert">
              <Icon icon={Icons.info} />
              {s.mapFailed}
            </p>
          )}
        </div>
        <p className="vpd-map-note">
          <Icon icon={Icons.info} />
          <span>
            {s.mapNote} <span className="vpd-map-hint">{s.mapHint}</span>
          </span>
        </p>
      </div>

      <aside className="vpd-map-rail" aria-label={s.mapListLabel}>
        <p className="vpd-map-rail-head">
          <strong>{s.mapListLabel}</strong>
          <span className="tabular-nums">{filtered.length}</span>
        </p>
        {filtered.length > 0 ? (
          <ul className="vpd-map-list">
            {filtered.map((c) => (
              <li key={c.slug}>
                <Link href={locale === "en" ? `/companies/${c.slug}/` : `/ko/companies/${c.slug}/`} className="vpd-map-item">
                  <span className="vpd-logo vpd-map-logo">
                    <Logo slug={c.slug} name={c.name} className="max-h-5 max-w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="vpd-map-name">{c.name}</span>
                    <span className="vpd-map-meta">
                      <SectorIcon id={c.sector} />
                      {sectors.find((x) => x.id === c.sector)?.label} · {c.city}
                    </span>
                  </span>
                  <Icon icon={Icons.arrowUpRight} className="vpd-map-go" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="vpd-map-empty">
            <p>{s.emptyTitle}</p>
            <button type="button" onClick={p.onClear}>
              <Icon icon={Icons.reset} />
              {s.resetFilters}
            </button>
          </div>
        )}
      </aside>

      <div className="vpd-insights">
        <figure className="vpd-chart">
          <figcaption>
            <strong>{s.chartSectors}</strong>
            <span>{s.chartSectorsHint}</span>
          </figcaption>
          <div ref={barEl} className="vpd-chart-box vpd-chart-bars" aria-hidden="true" />
          <table className="sr-only">
            <caption>{s.chartSectors}</caption>
            <thead>
              <tr>
                <th scope="col">{s.filterSector}</th>
                <th scope="col">{s.chartTableCount}</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((x) => (
                <tr key={x.id}>
                  <th scope="row">{x.label}</th>
                  <td>{sectorCounts.get(x.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
        <figure className="vpd-chart">
          <figcaption>
            <strong>{s.chartYears}</strong>
            <span>{s.chartYearsHint}</span>
          </figcaption>
          <div ref={histEl} className="vpd-chart-box vpd-chart-hist" aria-hidden="true" />
          <table className="sr-only">
            <caption>{s.chartYears}</caption>
            <thead>
              <tr>
                <th scope="col">{s.filterYears}</th>
                <th scope="col">{s.chartTableCount}</th>
              </tr>
            </thead>
            <tbody>
              {yearList.map((y) => (
                <tr key={y}>
                  <th scope="row">{y}</th>
                  <td>{yearCounts.get(String(y)) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="vpd-range" style={{ "--a": `${pct(from)}%`, "--b": `${pct(to)}%` } as React.CSSProperties}>
            <span className="vpd-range-track" aria-hidden="true" />
            <input type="range" className={pct(from) > 50 ? "is-top" : undefined} min={years[0]} max={years[1]} step={1} value={from} aria-label={s.yearFrom} aria-valuetext={String(from)} onChange={(e) => setFrom(Number(e.target.value))} />
            <input type="range" min={years[0]} max={years[1]} step={1} value={to} aria-label={s.yearTo} aria-valuetext={String(to)} onChange={(e) => setTo(Number(e.target.value))} />
          </div>
          <p className="vpd-range-val tabular-nums" aria-live="polite">
            {s.filterYears} {yearsLabel}
          </p>
        </figure>
      </div>
    </div>
  );
}
