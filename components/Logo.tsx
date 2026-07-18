import { hashString } from "@/lib/hash";

/**
 * Deterministic SVG monogram "logo". Aspect ratios vary on purpose so the
 * card frame demonstrates logo normalization — mismatched source logos
 * absorbed by a uniform container.
 */
const PALETTE = [
  { bg: "#e7e0d8", fg: "#57534e" }, // warm stone
  { bg: "#dbe4dd", fg: "#3f6152" }, // sage
  { bg: "#dde3ea", fg: "#3e5468" }, // slate blue
  { bg: "#e8dee6", fg: "#5f4460" }, // mauve
  { bg: "#e9e2d0", fg: "#6b5d34" }, // olive sand
  { bg: "#dee6e8", fg: "#38585e" }, // teal mist
  { bg: "#eadedc", fg: "#6b4540" }, // clay
  { bg: "#e2e2e9", fg: "#4b4b63" }, // periwinkle grey
];
const RATIOS: Array<[number, number]> = [
  [48, 48],
  [64, 40],
  [40, 64],
  [72, 32],
  [56, 44],
];

export function Logo({ slug, name, className }: { slug: string; name: string; className?: string }) {
  const h = hashString(slug);
  const p = PALETTE[h % PALETTE.length];
  const [w, ht] = RATIOS[(h >>> 3) % RATIOS.length];
  const wide = w / ht >= 1.5;
  const label = wide ? name.slice(0, 3).toUpperCase() : name.charAt(0).toUpperCase();
  const fontSize = wide ? ht * 0.42 : Math.min(w, ht) * 0.5;
  const rounded = (h >>> 6) % 2 === 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${ht}`}
      role="img"
      aria-label={`${name} logo (auto-generated demo monogram)`}
      className={className}
    >
      <rect width={w} height={ht} rx={rounded ? Math.min(w, ht) * 0.22 : Math.min(w, ht) * 0.5} fill={p.bg} />
      <text
        x="50%"
        y="54%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
        letterSpacing={wide ? 1 : 0}
        fontSize={fontSize}
        fill={p.fg}
      >
        {label}
      </text>
    </svg>
  );
}
