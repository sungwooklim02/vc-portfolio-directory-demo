"use client";

/**
 * Signature motion graphic — "portfolio orbit".
 * Every one of the 80 (fictional) portfolio companies is a dot travelling on one of the three
 * orbital rings of the hero mark, coloured by sector; exits (acquired / IPO) carry a pulsing halo.
 * On first load the dots launch out of the core onto their rings. When the directory filter or
 * search changes (custom event "vpd:filter"), the matching companies swell and link to the core
 * while the rest dim — the hero visually explains what the filter just did.
 * Floors: with reduced motion / capture-mode the canvas stays empty (static hero unchanged);
 * the loop pauses off-screen and in hidden tabs. Under 600px the orbit is shown only when motion
 * is on (html.mk-on), as a faint background mark behind the hero copy.
 */
import { useEffect, useRef } from "react";
import { mk } from "@/lib/mk";

export interface OrbitDot {
  slug: string;
  sector: string;
  status: string;
}

const SECTOR_COLORS = ["#2f6b4f", "#5b7fa6", "#7aa86b", "#b5644f", "#c08a3e", "#3f9b8f", "#8a6bb0", "#4f6e8a"];
const RING_ANGLES = [-28, 32, 90].map((d) => (d * Math.PI) / 180);
const RING_SPEED = [0.00016, -0.00012, 0.0002]; // rad per ms

export function PortfolioOrbit({ dots, sectorIds }: { dots: OrbitDot[]; sectorIds: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const host = cv?.parentElement;
    const ctx = cv?.getContext("2d");
    const M = mk();
    if (!cv || !host || !ctx || !M) return;

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
      cv.width = Math.max(1, Math.round(W * dpr));
      cv.height = Math.max(1, Math.round(H * dpr));
    };
    size();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(size) : null;
    ro?.observe(host);

    const perRing = [0, 0, 0];
    const ringOf = dots.map((d) => Math.max(0, sectorIds.indexOf(d.sector)) % 3);
    ringOf.forEach((r) => perRing[r]++);
    const seen = [0, 0, 0];
    const state = dots.map((d, i) => {
      const ring = ringOf[i];
      const k = seen[ring]++;
      return {
        slug: d.slug,
        ring,
        phase: (k / Math.max(1, perRing[ring])) * Math.PI * 2 + ring * 0.7,
        color: SECTOR_COLORS[Math.max(0, sectorIds.indexOf(d.sector)) % SECTOR_COLORS.length],
        exit: d.status !== "active",
        born: 500 + i * 16,
        hl: 1,
        target: 1,
        link: 0,
        linkTarget: 0,
      };
    });

    const onFilter = (e: Event) => {
      const detail = (e as CustomEvent<{ slugs: string[]; all: boolean }>).detail;
      if (!detail) return;
      const set = new Set(detail.slugs);
      for (const s of state) {
        const on = detail.all || set.has(s.slug);
        s.target = detail.all ? 1 : on ? 1.9 : 0.16;
        s.linkTarget = !detail.all && on ? 1 : 0;
      }
    };
    window.addEventListener("vpd:filter", onFilter);

    // pointer tilt (parallax) on the hero
    const hero = host.closest<HTMLElement>(".venture-hero");
    const onMove = (e: PointerEvent) => {
      if (M.off() || !hero) return;
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      host.style.setProperty("--tx", `${(-ny * 14).toFixed(2)}deg`);
      host.style.setProperty("--ty", `${(nx * 18).toFixed(2)}deg`);
    };
    const onLeave = () => {
      host.style.setProperty("--tx", "0deg");
      host.style.setProperty("--ty", "0deg");
    };
    hero?.addEventListener("pointermove", onMove);
    hero?.addEventListener("pointerleave", onLeave);

    const easeOut = (p: number) => 1 - Math.pow(1 - p, 4);

    const stop = M.loop(host, (t, still) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (still || !W) return;
      const dark = document.documentElement.classList.contains("dark");
      const cx = W / 2;
      const cy = H / 2;
      const R = W / 2 - 20; // rings are inset 20px (globals.css .venture-orbit i)
      const a = R * 0.56;
      const b = R;
      for (const s of state) {
        s.hl += (s.target - s.hl) * 0.1;
        s.link += (s.linkTarget - s.link) * 0.08;
        const launch = easeOut(Math.min(1, Math.max(0, (t - s.born) / 1100)));
        if (launch <= 0) continue;
        const th = RING_ANGLES[s.ring];
        const cos = Math.cos(th);
        const sin = Math.sin(th);
        const pos = (ang: number) => {
          const x0 = a * Math.cos(ang) * launch;
          const y0 = b * Math.sin(ang) * launch;
          return [cx + x0 * cos - y0 * sin, cy + x0 * sin + y0 * cos, Math.cos(ang)] as const;
        };
        const ang = s.phase + RING_SPEED[s.ring] * t;
        const [x, y, depth] = pos(ang);
        const front = (depth + 1) / 2; // 0 back .. 1 front
        const hidden = depth < 0 && Math.hypot(x - cx, y - cy) < coreR;
        let alpha = (0.35 + 0.65 * front) * Math.min(1, s.hl) * (hidden ? 0.22 : 1);
        alpha = Math.max(0, Math.min(1, alpha));
        const rad = (1.6 + 1.6 * front) * Math.max(0.6, s.hl);

        // link to the core for filtered companies
        if (s.link > 0.02) {
          ctx.globalAlpha = 0.28 * s.link * (hidden ? 0.4 : 1);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        // comet tail
        const dirSign = Math.sign(RING_SPEED[s.ring]);
        for (let k = 1; k <= 4; k++) {
          const [tx, ty] = pos(ang - dirSign * k * 0.045);
          ctx.globalAlpha = alpha * (0.32 - k * 0.07);
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(tx, ty, rad * (1 - k * 0.17), 0, Math.PI * 2);
          ctx.fill();
        }
        // dot
        ctx.globalAlpha = alpha;
        ctx.fillStyle = dark ? "#e9f1de" : s.color;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
        if (dark) {
          ctx.globalAlpha = alpha * 0.8;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        // exit halo pulse
        if (s.exit) {
          const pulse = (t / 1600 + s.phase) % 1;
          ctx.globalAlpha = alpha * (1 - pulse) * 0.7;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, rad + 2 + pulse * 9, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    });

    return () => {
      stop();
      ro?.disconnect();
      window.removeEventListener("vpd:filter", onFilter);
      hero?.removeEventListener("pointermove", onMove);
      hero?.removeEventListener("pointerleave", onLeave);
    };
  }, [dots, sectorIds]);

  return (
    <div className="venture-orbit" aria-hidden="true">
      <i></i>
      <i></i>
      <i></i>
      <canvas ref={canvasRef} className="vpd-orbit-canvas" />
      <span>V.</span>
    </div>
  );
}
