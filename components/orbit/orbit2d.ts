/**
 * 2D fallback for the hero orbit — used only when the three.js scene cannot run (?webgl=0, no WebGL,
 * lost context, data-saver, vendor bundle failed). Same information as the 3D scene: 80 dots in sector
 * colours on the three rings, exits with a halo, filtered companies linked to the core.
 * With reduced motion / capture-mode it draws the final state once (dots on their rings) and redraws only
 * when the filter or the hover focus changes; otherwise it animates and pauses off-screen / in hidden tabs (MK.loop).
 */
import { mk } from "@/lib/mk";
import type { Palette } from "@/lib/palette";
import type { OrbitDot } from "./OrbitScene";

const RING_ANGLES = [-28, 32, 90].map((d) => (d * Math.PI) / 180);
const RING_SPEED = [0.00016, -0.00012, 0.0002]; // rad per ms

export function startOrbit2D(
  canvas: HTMLCanvasElement,
  dots: OrbitDot[],
  sectorIds: string[],
  colors: () => Palette,
  initial: { slugs: string[]; all: boolean } | null,
): () => void {
  const host = canvas.parentElement;
  const ctx = canvas.getContext("2d");
  const M = mk();
  if (!host || !ctx || !M) return () => {};

  let W = 0;
  let H = 0;
  let dpr = 1;
  let coreR = 100;
  const size = () => {
    const r = host.getBoundingClientRect();
    W = r.width;
    H = r.height;
    coreR = (parseFloat(getComputedStyle(host, "::before").width) || 200) / 2;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  };
  size();

  const perRing = [0, 0, 0];
  const ringOf = dots.map((d) => Math.max(0, sectorIds.indexOf(d.sector)) % 3);
  ringOf.forEach((r) => perRing[r]++);
  const seen = [0, 0, 0];
  const state = dots.map((d, i) => {
    const ring = ringOf[i];
    const k = seen[ring]++;
    return {
      slug: d.slug,
      sector: d.sector,
      ring,
      phase: (k / Math.max(1, perRing[ring])) * Math.PI * 2 + ring * 0.7,
      ci: Math.max(0, sectorIds.indexOf(d.sector)),
      exit: d.status !== "active",
      born: 500 + i * 16,
      hl: 1,
      target: 1,
      link: 0,
      linkTarget: 0,
    };
  });

  const easeOut = (p: number) => 1 - Math.pow(1 - p, 4);
  const draw = (t: number, still: boolean) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!W) return;
    const pal = colors();
    const dark = document.documentElement.classList.contains("dark");
    const cx = W / 2;
    const cy = H / 2;
    const R = W / 2 - 20; // rings are inset 20px (globals.css .venture-orbit i)
    const a = R * 0.56;
    const b = R;
    for (const s of state) {
      if (still) {
        s.hl = s.target;
        s.link = s.linkTarget;
      } else {
        s.hl += (s.target - s.hl) * 0.1;
        s.link += (s.linkTarget - s.link) * 0.08;
      }
      const launch = still ? 1 : easeOut(Math.min(1, Math.max(0, (t - s.born) / 1100)));
      if (launch <= 0) continue;
      const color = pal.sectors[s.ci % pal.sectors.length];
      const th = RING_ANGLES[s.ring];
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const pos = (ang: number) => {
        const x0 = a * Math.cos(ang) * launch;
        const y0 = b * Math.sin(ang) * launch;
        return [cx + x0 * cos - y0 * sin, cy + x0 * sin + y0 * cos, Math.cos(ang)] as const;
      };
      const ang = s.phase + (still ? 0 : RING_SPEED[s.ring] * t);
      const [x, y, depth] = pos(ang);
      const front = (depth + 1) / 2; // 0 back .. 1 front
      const hidden = depth < 0 && Math.hypot(x - cx, y - cy) < coreR;
      let alpha = (0.35 + 0.65 * front) * Math.min(1, s.hl) * (hidden ? 0.22 : 1);
      alpha = Math.max(0, Math.min(1, alpha));
      const rad = (1.6 + 1.6 * front) * Math.max(0.6, s.hl);
      if (s.link > 0.02) {
        ctx.globalAlpha = 0.28 * s.link * (hidden ? 0.4 : 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      if (!still) {
        const dirSign = Math.sign(RING_SPEED[s.ring]);
        for (let k = 1; k <= 4; k++) {
          const [tx, ty] = pos(ang - dirSign * k * 0.045);
          ctx.globalAlpha = alpha * (0.32 - k * 0.07);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(tx, ty, rad * (1 - k * 0.17), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = dark ? pal.orbitDot : color;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
      // a small specular glint, so the flat fallback reads like the glossy beads of the 3D scene
      if (rad > 2.2) {
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
      if (dark) {
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      if (s.exit) {
        const pulse = still ? 0.4 : (t / 1600 + s.phase) % 1;
        ctx.globalAlpha = alpha * (1 - pulse) * 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, rad + 2 + pulse * 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const redrawStill = () => {
    if (M.off()) draw(0, true);
  };
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (size(), redrawStill())) : null;
  ro?.observe(host);

  // same rules as the 3D scene (OrbitScene retarget): filter swells + links, then a hovered card / sector
  // chip ("vpd:hover") swells its dot or sector and dims the rest
  let filter: { slugs: string[]; all: boolean } | null = null;
  let focusSlug: string | null = null;
  let focusSector: string | null = null;
  const retarget = () => {
    const set = new Set(filter?.slugs ?? []);
    const filterOn = !!filter && !filter.all;
    for (const s of state) {
      const on = !filterOn || set.has(s.slug);
      let target = filterOn ? (on ? 1.9 : 0.16) : 1;
      if (focusSector) target = s.sector === focusSector ? Math.max(target, 1.7) : Math.min(target, 0.35);
      if (focusSlug === s.slug) target = 2.6;
      s.target = target;
      s.linkTarget = filterOn && on ? 1 : 0;
    }
    redrawStill();
  };
  const applyFilter = (detail: { slugs: string[]; all: boolean } | null | undefined) => {
    if (!detail) return;
    filter = detail;
    retarget();
  };
  const onFilter = (e: Event) => applyFilter((e as CustomEvent<{ slugs: string[]; all: boolean }>).detail);
  const onHover = (e: Event) => {
    const d = (e as CustomEvent<{ slug?: string | null; sector?: string | null }>).detail;
    if (!d) return;
    if ("slug" in d) focusSlug = d.slug ?? null;
    if ("sector" in d) focusSector = d.sector ?? null;
    retarget();
  };
  applyFilter(initial);
  window.addEventListener("vpd:filter", onFilter);
  window.addEventListener("vpd:hover", onHover);
  const stop = M.loop(host, draw);

  return () => {
    stop();
    ro?.disconnect();
    window.removeEventListener("vpd:filter", onFilter);
    window.removeEventListener("vpd:hover", onHover);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
}
