"use client";

import { useLayoutEffect, useRef } from "react";
import { Icon, Icons } from "@/components/icons";
import type { ViewKey } from "@/lib/dirState";
import { t, type Locale } from "@/lib/i18n";
import { mk } from "@/lib/mk";

/** [Grid | Map] segmented control; the pressed segment's pill slides (motion on). */
export function ViewToggle({ locale, view, onChange }: { locale: Locale; view: ViewKey; onChange: (v: ViewKey) => void }) {
  const s = t(locale);
  const ref = useRef<HTMLDivElement>(null);
  const place = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const M = mk();
    if (!M || M.off() || !ref.current) return;
    ref.current.classList.add("has-ind");
    place.current = M.indicator(ref.current, ':scope > button[aria-pressed="true"]');
    document.fonts?.ready.then(() => place.current?.()).catch(() => {});
  }, []);
  useLayoutEffect(() => {
    place.current?.();
  }, [view]);
  const items: Array<{ id: ViewKey; label: string; icon: typeof Icons.grid }> = [
    { id: "grid", label: s.viewGrid, icon: Icons.grid },
    { id: "map", label: s.viewMap, icon: Icons.map },
  ];
  return (
    <div ref={ref} className="vpd-seg" role="group" aria-label={s.viewLabel}>
      {items.map((it) => (
        <button key={it.id} type="button" aria-pressed={view === it.id} onClick={() => view !== it.id && onChange(it.id)}>
          <Icon icon={it.icon} />
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
}
