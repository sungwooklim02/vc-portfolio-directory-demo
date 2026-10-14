"use client";

/**
 * Motion runtime (ADR 0065 Amend (3), demo-design.md section 10-3).
 * - Re-asserts ?capture=1 -> body.capture-mode on every route (floor 1).
 * - Per-route entry choreography: [data-mk-enter] stagger, [data-mk-reveal] scroll reveal,
 *   [data-mk-count] count-up, [data-mk-wipe] clip-path wipe, bigger hero reveal on first load.
 * - Same-locale route changes run inside a View Transition (directional slide + shared logo morph).
 * - Ripple on chips/cards, header elevation and hero parallax on scroll.
 * All motion is skipped when the kit reports off (reduced motion / capture-mode); the inline
 * boot script only pre-hides content when motion is on, and this effect always clears it.
 */
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { mk, type MotionKit } from "@/lib/mk";
import { cameFrom } from "@/lib/nav";
import { BASE_PATH } from "@/lib/site";

type VTDoc = Document & {
  startViewTransition?: (cb: () => Promise<void> | void) => { finished: Promise<void>; ready: Promise<void> };
};

function isCapture(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("capture") === "1";
  } catch {
    return false;
  }
}

function heroIntro(M: MotionKit, hero: HTMLElement, first: boolean) {
  const big = first;
  const title = hero.querySelector<HTMLElement>(".venture-title");
  if (title) {
    title.animate(
      [
        { clipPath: "inset(-10% -10% 100% -10%)", transform: "translateY(48px)", opacity: 0 },
        { clipPath: "inset(-10% -10% -30% -10%)", transform: "none", opacity: 1 },
      ],
      { duration: big ? M.ms("--dur-5") : M.ms("--dur-4"), delay: big ? 140 : 40, easing: M.EASE.expo, fill: "backwards" },
    );
    const em = title.querySelector<HTMLElement>("em");
    if (em)
      em.animate(
        [{ opacity: 0, filter: "blur(10px)" }, { opacity: 1, filter: "blur(0)" }],
        { duration: M.ms("--dur-5"), delay: big ? 520 : 200, easing: M.EASE.out, fill: "backwards" },
      );
  }
  const orbit = hero.querySelector<HTMLElement>(".venture-orbit");
  if (!orbit || getComputedStyle(orbit).display === "none") return;
  const angles = [-28, 32, 90];
  orbit.querySelectorAll<HTMLElement>(":scope > i").forEach((ring, k) => {
    const a = angles[k] ?? 0;
    ring.animate(
      [
        { transform: `rotate(${a - 160}deg) scaleX(0.04)`, opacity: 0 },
        { transform: `rotate(${a}deg) scaleX(0.56)`, opacity: 1 },
      ],
      { duration: big ? 1400 : M.ms("--dur-5"), delay: (big ? 220 : 60) + k * 140, easing: M.EASE.expo, fill: "backwards" },
    );
  });
  orbit.animate(
    [{ transform: "scale(.25)", opacity: 0 }, { transform: "none", opacity: 1 }],
    { pseudoElement: "::before", duration: big ? 1200 : M.ms("--dur-4"), delay: big ? 120 : 0, easing: M.EASE.spring, fill: "backwards" },
  );
  const mark = orbit.querySelector<HTMLElement>(":scope > span");
  if (mark)
    mark.animate(
      [{ opacity: 0, transform: "scale(1.9)", filter: "blur(14px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }],
      { duration: M.ms("--dur-5"), delay: big ? 640 : 160, easing: M.EASE.expo, fill: "backwards" },
    );
}

function choreograph(M: MotionKit, main: HTMLElement, first: boolean) {
  const hero = main.querySelector<HTMLElement>(".venture-hero");
  if (hero) heroIntro(M, hero, first);
  M.enter(main.querySelectorAll("[data-mk-enter]"), {
    y: first ? 26 : 16,
    blur: first ? 8 : 0,
    step: first ? 70 : 50,
    delay: hero && first ? 260 : 0,
    dur: M.ms("--dur-4"),
  });
  M.countAll(main);
  M.reveal(main.querySelectorAll("[data-mk-reveal]"), { y: 32 });
  main.querySelectorAll<HTMLElement>("[data-mk-wipe]").forEach((el) => {
    el.animate(
      [
        { clipPath: "inset(0 100% 0 0)", opacity: 0.3 },
        { clipPath: "inset(0 0% 0 0)", opacity: 1 },
      ],
      { duration: M.ms("--dur-5"), delay: 160, easing: M.EASE.expo, fill: "backwards" },
    );
    M.draw(el.querySelectorAll("g[fill='none'] circle"), { delay: 300, step: 90 });
  });
}

export function MotionRuntime() {
  const pathname = usePathname();
  const router = useRouter();
  const first = useRef(true);
  const pending = useRef<(() => void) | null>(null);
  const backSlug = useRef<string | null>(null);
  const prevPath = useRef<string | null>(null);

  // per-route: capture floor, choreography, finish any pending View Transition
  useLayoutEffect(() => {
    // previous in-app route (read by BackToDirectory to go back in history instead of reloading the directory)
    (window as Window & { __vpdPrevPath?: string }).__vpdPrevPath = prevPath.current ?? undefined;
    prevPath.current = pathname;
    const html = document.documentElement;
    if (isCapture()) {
      document.body.classList.add("capture-mode");
      html.classList.add("capture-mode");
    }
    const M = mk();
    const main = document.querySelector<HTMLElement>("main");
    try {
      if (M && main && !M.off()) {
        choreograph(M, main, first.current);
        if (pending.current && backSlug.current) {
          const li = main.querySelector<HTMLElement>(`.venture-grid > li[data-key="${CSS.escape(backSlug.current)}"] .vpd-logo`);
          if (li) {
            const r = li.getBoundingClientRect();
            if (r.bottom > 0 && r.top < window.innerHeight) li.style.viewTransitionName = "vpd-logo";
          }
        }
      }
    } finally {
      html.classList.remove("mk-boot");
      first.current = false;
      const done = pending.current;
      pending.current = null;
      if (done) done();
    }
  }, [pathname]);

  // same-locale route changes inside a View Transition
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const M = mk();
      const d = document as VTDoc;
      if (!M || M.off() || !d.startViewTransition) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE_PATH + "/") || url.hash) return;
      if (url.pathname === window.location.pathname) return;
      const cur = window.location.pathname.slice(BASE_PATH.length);
      const next = url.pathname.slice(BASE_PATH.length);
      const isKo = (p: string) => p === "/ko" || p.startsWith("/ko/");
      if (isKo(cur) !== isKo(next)) return; // different root layout -> full load (cross-document VT handles it)
      e.preventDefault();
      e.stopPropagation();
      const html = document.documentElement;
      const toDetail = next.includes("/companies/");
      const fromDetail = cur.includes("/companies/");
      const dir = !toDetail && fromDetail ? "vt-back" : "vt-fwd";
      const back = a.hasAttribute("data-back") && cameFrom(next);
      const logo = a.querySelector<HTMLElement>(".vpd-logo");
      if (toDetail && logo) logo.style.viewTransitionName = "vpd-logo";
      backSlug.current = fromDetail ? (cur.split("/companies/")[1] || "").replace(/\/$/, "") : null;
      html.classList.add("vt-route", dir);
      const vt = d.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            pending.current = resolve;
            // safety cap only (not a delay): if the route never commits, release the frozen frame
            window.setTimeout(() => {
              if (pending.current === resolve) {
                pending.current = null;
                resolve();
              }
            }, 3000);
            if (back) window.history.back();
            else router.push(next + url.search);
          }),
      );
      vt.finished.finally(() => {
        html.classList.remove("vt-route", "vt-fwd", "vt-back");
        document.querySelectorAll<HTMLElement>(".vpd-logo").forEach((el) => (el.style.viewTransitionName = ""));
      });
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [router]);

  // ripple + header elevation + hero parallax (scroll-linked, rAF-throttled)
  useEffect(() => {
    const M = mk();
    if (!M) return;
    const w = window as unknown as { __vpdRipple?: boolean };
    if (!w.__vpdRipple) {
      w.__vpdRipple = true;
      M.ripple(".vpd-chips > button, .vpd-filter-btn, .vpd-sheet-done, .venture-grid > li > a");
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      if (M.off()) return;
      const y = window.scrollY;
      document.querySelector(".venture-header")?.classList.toggle("is-scrolled", y > 8);
      const orbit = document.querySelector<HTMLElement>(".venture-orbit");
      if (orbit) orbit.style.setProperty("--py", `${Math.min(y * 0.22, 140).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
