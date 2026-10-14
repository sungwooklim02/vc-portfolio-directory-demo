"use client";

import { Icon, Icons } from "@/components/icons";
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
      {/* sun shown in dark mode, moon in light mode (Lucide; .vpd-sun/.vpd-moon spin in, motion.css) */}
      <Icon icon={Icons.sun} className="vpd-sun hidden dark:block" />
      <Icon icon={Icons.moon} className="vpd-moon dark:hidden" />
    </button>
  );
}
