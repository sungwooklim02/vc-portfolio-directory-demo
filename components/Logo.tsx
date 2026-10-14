import { hashString } from "@/lib/hash";
import { MARKS, SECTOR_COLOURS, type MarkShape } from "./logo/marks";

/**
 * Deterministic brand mark for a FICTIONAL company: one of 24 hand-drawn abstract marks (components/logo/
 * marks.ts) in one of three sector-tied brand colours, presented in one of four container styles — solid
 * rounded square, solid circle, bare mark, or tinted tile. The mix is intentional: real portfolio logos
 * never arrive in one format, and the uniform card frame normalises them into one grid.
 * The company name is set as text next to the mark wherever the logo appears, so the tile shows the mark only.
 */
type Container = "squircle" | "circle" | "bare" | "tint";
const CONTAINERS: Container[] = ["squircle", "circle", "bare", "tint"];

function Shape({ s, fill }: { s: MarkShape; fill: string }) {
  if (s.k === "circle") return <circle cx={s.cx} cy={s.cy} r={s.r} className={fill} />;
  if (s.k === "rect") return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} className={fill} />;
  return <path d={s.d} className={fill} fillRule={s.evenOdd ? "evenodd" : undefined} clipRule={s.evenOdd ? "evenodd" : undefined} />;
}

export function Logo({ slug, name, sector, className }: { slug: string; name: string; sector: string; className?: string }) {
  const h = hashString(slug);
  const shades = SECTOR_COLOURS[sector] ?? SECTOR_COLOURS.deeptech;
  const [base, tint, light] = shades[(h >>> 7) % shades.length];
  const mark = MARKS[h % MARKS.length];
  const container = CONTAINERS[(h >>> 11) % CONTAINERS.length];
  const style = { "--lg-a": base, "--lg-b": tint, "--lg-c": light } as React.CSSProperties;
  const label = `${name} logo (fictional brand mark)`;

  if (container === "bare") {
    return (
      <svg viewBox="0 0 24 24" role="img" aria-label={label} className={className} style={style} data-logo-mark="bare">
        {mark.map((s, i) => (
          <Shape key={i} s={s} fill={s.tone === 0 ? "vpd-lg-ink" : "vpd-lg-ink2"} />
        ))}
      </svg>
    );
  }
  const solid = container === "squircle" || container === "circle";
  return (
    <svg viewBox="0 0 36 36" role="img" aria-label={label} className={className} style={style} data-logo-mark={container}>
      {container === "circle" ? (
        <circle cx="18" cy="18" r="18" className="vpd-lg-solid" />
      ) : (
        <rect width="36" height="36" rx="9.5" className={solid ? "vpd-lg-solid" : "vpd-lg-tint"} />
      )}
      <g transform="translate(6 6)">
        {mark.map((s, i) => (
          <Shape key={i} s={s} fill={solid ? (s.tone === 0 ? "vpd-lg-on" : "vpd-lg-on2") : s.tone === 0 ? "vpd-lg-ink" : "vpd-lg-ink2"} />
        ))}
      </g>
    </svg>
  );
}
