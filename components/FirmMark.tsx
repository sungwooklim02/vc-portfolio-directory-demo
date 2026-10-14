import { FIRM_MARK } from "@/lib/firm-mark.mjs";

/** Header logo of the fictional firm — same source as public/favicon.svg (lib/firm-mark.mjs). */
export function FirmMark({ className }: { className?: string }) {
  const m = FIRM_MARK;
  return (
    <svg viewBox={m.viewBox} className={className} aria-hidden="true" data-firm-mark>
      <rect width="48" height="48" rx={m.tile.rx} className="vpd-fm-tile" />
      <path d={m.v.d} fill="none" className="vpd-fm-v" strokeWidth={m.v.width} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={m.dot.cx} cy={m.dot.cy} r={m.dot.r} className="vpd-fm-dot" />
    </svg>
  );
}
