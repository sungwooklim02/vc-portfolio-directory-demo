"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon, Icons } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";
import { mk } from "@/lib/mk";

/**
 * "Visit website" button for fictional companies — never navigates.
 * Shows an honest "fictional company" toast instead. The toast springs in and, on auto-dismiss,
 * animates out before it is removed (close animates too); a repeat click re-pops it.
 */
export function ExternalLinkButton({ locale }: { locale: Locale }) {
  const s = t(locale);
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (show) mk()?.overlayIn(toastRef.current, "pop");
  }, [show]);

  function hide() {
    const M = mk();
    if (!M) {
      setShow(false);
      return;
    }
    M.overlayOut(toastRef.current, "pop", () => setShow(false));
  }

  function onClick() {
    if (show) mk()?.overlayIn(toastRef.current, "pop"); // re-pop (also cancels a running exit)
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, 3000);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="vpd-ext-btn group inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {s.visitWebsite}
        <Icon icon={Icons.arrowUpRight} className="vpd-ext-arrow" />
      </button>
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 transition-opacity duration-200 ${show ? "opacity-100" : "opacity-0"}`}
      >
        {show && (
          <p ref={toastRef} className="max-w-md rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm text-zinc-100 shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
            {s.toastExternal}
          </p>
        )}
      </div>
    </>
  );
}
