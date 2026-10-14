"use client";

/**
 * Signature motion graphic — "portfolio orbit": every one of the 80 (fictional) portfolio companies is a
 * dot on one of the three orbital rings of the hero mark, coloured by sector; exits carry a pulsing halo.
 *
 * Rendering (demo-design.md 11-5):
 *  - The CSS rings + core are the skeleton shown immediately (and the intro animation in MotionRuntime).
 *  - After hydration, on idle, the vendored three.js bundle is injected and components/orbit/OrbitScene.ts
 *    takes over (real 3D: lighting, depth occlusion, raycast hover, drag-rotate, Ctrl/pinch zoom, reset).
 *    The CSS mark then cross-fades out. three.js is never part of the first-screen JS.
 *  - Fallback (?webgl=0, no WebGL, lost context, data-saver, bundle failure): the 2D canvas renderer with
 *    the same information, plus a one-line notice in the legend under the hero.
 *  - Under 600px the orbit is a faint, non-interactive background mark, shown only when motion is on; it is
 *    drawn by the 2D canvas there, so phones never download three.js.
 *  - Capture-mode (?capture=1): the scene loads immediately and <html data-orbit-ready="1"> marks the
 *    settled final frame (host data-orbit="3d" | "2d"); captures wait on that attribute, not a timer.
 * Data motion: the directory filter ("vpd:filter") swells + links the matching companies; hovering a card
 * or a sector chip/legend item ("vpd:hover") highlights the matching dots; hovering a dot marks its card
 * ("vpd:dot"); a dot opens its detail page.
 * Floors: reduced motion / capture-mode -> no loop, the final state drawn once (dots on their rings).
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, Icons } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";
import { loadVendor, VENDOR } from "@/lib/loadScript";
import { motionOff } from "@/lib/mk";
import { goTo } from "@/lib/nav";
import { readPalette, watchTheme } from "@/lib/palette";
import type { OrbitDot, OrbitScene, ThreeLite } from "./orbit/OrbitScene";

export type { OrbitDot };

export type OrbitMode = "skeleton" | "3d" | "2d";
declare global {
  interface Window {
    __vpdOrbit?: { mode: OrbitMode; note: boolean; interactive: boolean };
  }
}
function announce(mode: OrbitMode, note: boolean, interactive: boolean) {
  window.__vpdOrbit = { mode, note, interactive };
  window.dispatchEvent(new CustomEvent("vpd:orbit", { detail: window.__vpdOrbit }));
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

interface Props {
  locale: Locale;
  dots: OrbitDot[];
  sectorIds: string[];
  label: string;
}

export function PortfolioOrbit({ locale, dots, sectorIds, label }: Props) {
  const s = t(locale);
  const router = useRouter();
  const hostRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const flatRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OrbitScene | null>(null);
  const [mode, setMode] = useState<OrbitMode>("skeleton");
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const gl = glRef.current;
    const flat = flatRef.current;
    if (!host || !gl || !flat) return;
    if (getComputedStyle(host).display === "none") {
      // < 600px with motion off: the static layout has no orbit, so the first frame is already final
      document.documentElement.dataset.orbitReady = "1";
      return () => {
        delete document.documentElement.dataset.orbitReady;
      };
    }

    let dead = false;
    let stop2d: (() => void) | null = null;
    let lastFilter: { slugs: string[]; all: boolean } | null = null;
    const interactive = window.matchMedia("(min-width: 601px)").matches;
    const colors = () => readPalette();

    let fellBack = false;
    let lastDot: string | null = null;
    // capture-mode (?capture=1): load the scene at once (no idle wait, no intro wait) and flag the settled
    // frame on <html data-orbit-ready="1"> so a capture can wait for the final hero instead of a timer
    const capture =
      document.documentElement.classList.contains("capture-mode") ||
      new URLSearchParams(window.location.search).get("capture") === "1";
    const settled = () => {
      if (!dead) document.documentElement.dataset.orbitReady = "1";
    };
    const fallback = (note: boolean) => {
      if (dead || fellBack) return;
      fellBack = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
      host.classList.remove("is-3d");
      setMode("2d");
      setTip(null);
      announce("2d", note, false);
      import("./orbit/orbit2d")
        .then(({ startOrbit2D }) => {
          if (!dead) stop2d = startOrbit2D(flat, dots, sectorIds, colors, lastFilter);
          settled();
        })
        .catch(() => {
          /* the CSS mark stays as the static view */
          settled();
        });
    };

    const onFilter = (e: Event) => {
      const d = (e as CustomEvent<{ slugs: string[]; all: boolean }>).detail;
      if (!d) return;
      lastFilter = d;
      sceneRef.current?.setFilter(d.all ? null : d.slugs);
    };
    const onHover = (e: Event) => {
      const d = (e as CustomEvent<{ slug?: string | null; sector?: string | null }>).detail;
      if (!d) return;
      if ("slug" in d) sceneRef.current?.setFocus(d.slug ?? null);
      if ("sector" in d) sceneRef.current?.setSectorFocus(d.sector ?? null);
    };
    window.addEventListener("vpd:filter", onFilter);
    window.addEventListener("vpd:hover", onHover);
    const unwatch = watchTheme((p) => sceneRef.current?.setPalette(p));

    let idle = 0;
    const params = new URLSearchParams(window.location.search);
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (params.get("webgl") === "0" || !webglAvailable()) fallback(true);
    else if (conn?.saveData) fallback(false);
    // phones: the orbit is a faint, non-interactive background mark, so the 2D canvas carries it and the
    // three.js bundle is never downloaded there
    else if (!interactive) fallback(false);
    else {
      const go = () => {
        loadVendor<ThreeLite>(VENDOR.three.file, VENDOR.three.global)
          .then(async (THREE) => {
            if (dead) return;
            const { createOrbitScene } = await import("./orbit/OrbitScene");
            // let the CSS mark's entry animation (MotionRuntime heroIntro) finish first: a running WAAPI
            // opacity would keep the CSS rings visible over the 3D ones and then drop them abruptly
            const intro = !capture && typeof host.getAnimations === "function" ? host.getAnimations({ subtree: true }) : [];
            if (intro.length)
              await Promise.race([
                Promise.allSettled(intro.map((a) => a.finished)),
                new Promise((r) => window.setTimeout(r, 2500)),
              ]);
            if (dead) return;
            try {
              sceneRef.current = createOrbitScene(THREE, {
                host,
                canvas: gl,
                dots,
                sectorIds,
                palette: readPalette(),
                interactive,
                still: motionOff,
                onHover: (dot, x, y) => {
                  setTip(dot ? { text: dot.label, x, y } : null);
                  if (dot?.slug !== lastDot) {
                    lastDot = dot?.slug ?? null;
                    window.dispatchEvent(new CustomEvent("vpd:dot", { detail: { slug: lastDot } }));
                  }
                },
                onPick: (dot) => goTo(locale === "en" ? `/companies/${dot.slug}/` : `/ko/companies/${dot.slug}/`, (p) => router.push(p)),
                onViewChanged: setMoved,
                onContextLost: () => fallback(true),
              });
            } catch {
              fallback(true);
              return;
            }
            if (lastFilter) sceneRef.current.setFilter(lastFilter.all ? null : lastFilter.slugs);
            host.classList.add("is-3d");
            setMode("3d");
            announce("3d", false, interactive);
            requestAnimationFrame(settled);
          })
          .catch(() => fallback(true));
      };
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (capture) go();
      else idle = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 1200 }) : window.setTimeout(go, 400);
    }

    return () => {
      dead = true;
      delete document.documentElement.dataset.orbitReady;
      if (lastDot) window.dispatchEvent(new CustomEvent("vpd:dot", { detail: { slug: null } }));
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      window.removeEventListener("vpd:filter", onFilter);
      window.removeEventListener("vpd:hover", onHover);
      unwatch();
      stop2d?.();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      host.classList.remove("is-3d");
    };
    // dots/sectorIds/locale are static page data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={hostRef} className="venture-orbit" data-orbit={mode}>
      <i aria-hidden="true"></i>
      <i aria-hidden="true"></i>
      <i aria-hidden="true"></i>
      <canvas ref={flatRef} className="vpd-orbit-canvas" {...(mode === "2d" ? { role: "img", "aria-label": label } : { "aria-hidden": true })} />
      <canvas ref={glRef} className="vpd-orbit-gl" {...(mode === "3d" ? { role: "img", "aria-label": label } : { "aria-hidden": true })} />
      <span aria-hidden="true">V.</span>
      {tip && (
        <p className="vpd-orbit-tip" style={{ transform: `translate(${Math.round(tip.x)}px, ${Math.round(tip.y)}px)` }}>
          {tip.text}
        </p>
      )}
      {mode === "3d" && moved && (
        <button type="button" className="vpd-orbit-reset" onClick={() => sceneRef.current?.resetView()}>
          <Icon icon={Icons.reset} />
          {s.orbitReset}
        </button>
      )}
    </div>
  );
}
