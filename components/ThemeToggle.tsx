"use client";

import { t, type Locale } from "@/lib/i18n";
import { mk } from "@/lib/mk";

type VTDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> };
};

export function ThemeToggle({ locale }: { locale: Locale }) {
  const s = t(locale);
  function apply() {
    const el = document.documentElement;
    const dark = el.classList.toggle("dark");
    try {
      localStorage.setItem("vpd-theme", dark ? "dark" : "light");
    } catch {
      /* private mode — ignore */
    }
  }
  /** Theme switch as a circular reveal growing from the button (View Transition); plain toggle when motion is off. */
  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const M = mk();
    const d = document as VTDoc;
    if (!M || M.off() || !d.startViewTransition) {
      apply();
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const html = document.documentElement;
    html.classList.add("vt-theme");
    const vt = d.startViewTransition(apply);
    vt.ready
      .then(() => {
        html.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
          { duration: M.ms("--dur-4"), easing: M.EASE.expo, pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
    vt.finished.finally(() => html.classList.remove("vt-theme"));
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={s.themeToggle}
      title={s.themeToggle}
      className="vpd-theme-btn inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {/* sun — shown in dark mode */}
      <svg className="vpd-sun hidden h-4 w-4 dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
      </svg>
      {/* moon — shown in light mode */}
      <svg className="vpd-moon h-4 w-4 dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    </button>
  );
}
