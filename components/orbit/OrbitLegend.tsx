"use client";

/**
 * Sector legend under the hero: tells what the orbit's colours mean, and works both ways with the directory
 * — selecting an item sets the sector filter (same state as the chips), hovering highlights that sector's
 * dots, and the pressed item follows the current sector filter. Also carries the orbit's one-line hint
 * (3D) or the honest fallback notice (2D).
 */
import { useEffect, useRef, useState } from "react";
import { Icon, Icons, SectorIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  sectors: Array<{ id: string; label: string; count: number }>;
}

export function OrbitLegend({ locale, sectors }: Props) {
  const s = t(locale);
  const [sector, setSector] = useState("all");
  const [orbit, setOrbit] = useState<{ mode: string; note: boolean; interactive: boolean } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<"start" | "mid" | "end" | "none">("start");

  // narrow screens scroll the row sideways: tell the CSS which edge fades (scroll cue), none when it all fits
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const sync = () => {
      const max = el.scrollWidth - el.clientWidth;
      setEdge(max <= 1 ? "none" : el.scrollLeft <= 1 ? "start" : el.scrollLeft >= max - 1 ? "end" : "mid");
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sectors]);

  useEffect(() => {
    if (window.__vpdOrbit) setOrbit(window.__vpdOrbit);
    const onOrbit = (e: Event) => setOrbit((e as CustomEvent<{ mode: string; note: boolean; interactive: boolean }>).detail);
    const onFilter = (e: Event) => {
      const d = (e as CustomEvent<{ sector?: string }>).detail;
      if (d?.sector) setSector(d.sector);
    };
    window.addEventListener("vpd:orbit", onOrbit);
    window.addEventListener("vpd:filter", onFilter);
    return () => {
      window.removeEventListener("vpd:orbit", onOrbit);
      window.removeEventListener("vpd:filter", onFilter);
    };
  }, []);

  const hover = (id: string | null) => window.dispatchEvent(new CustomEvent("vpd:hover", { detail: { sector: id } }));
  const note =
    orbit?.mode === "2d" && orbit.note ? s.orbitFallback : orbit?.mode === "3d" && orbit.interactive ? s.orbitHint : null;

  return (
    <div className="vpd-legend" data-mk-enter>
      <div ref={rowRef} className="vpd-legend-items" data-edge={edge} role="group" aria-label={s.legendTitle}>
        <span className="vpd-legend-title">{s.legendTitle}</span>
        {sectors.map((x, i) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={sector === x.id}
            onClick={() => window.dispatchEvent(new CustomEvent("vpd:pick", { detail: { sector: x.id } }))}
            onPointerEnter={() => hover(x.id)}
            onPointerLeave={() => hover(null)}
            onFocus={() => hover(x.id)}
            onBlur={() => hover(null)}
          >
            <span className="vpd-legend-dot" style={{ background: `var(--vpd-sector-${(i % 8) + 1})` }} aria-hidden="true" />
            <SectorIcon id={x.id} />
            <span>{x.label}</span>
            <span className="vpd-legend-n">{x.count}</span>
          </button>
        ))}
      </div>
      {note && (
        <p className="vpd-legend-note">
          <Icon icon={Icons.info} />
          {note}
        </p>
      )}
    </div>
  );
}
