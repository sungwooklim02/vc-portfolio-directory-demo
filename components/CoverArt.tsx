import { hashString } from "@/lib/hash";

/**
 * Deterministic SVG cover artwork for the detail page "photo" slot.
 * Zero raster images — same slug always renders the same art.
 */
const DUOS = [
  ["#d6cec3", "#8d7f6d"],
  ["#c9d6cd", "#5c7a68"],
  ["#cdd6de", "#5a7186"],
  ["#daccd7", "#7a5c78"],
  ["#ded7c2", "#857450"],
  ["#c9d9dc", "#4f7078"],
  ["#decfcc", "#835b54"],
  ["#d1d1de", "#616180"],
];

export function CoverArt({ slug, className }: { slug: string; className?: string }) {
  const h = hashString(`${slug}:cover`);
  const [light, deep] = DUOS[h % DUOS.length];
  const variant = (h >>> 4) % 3;
  const ox = 120 + (h % 560);

  let art: React.ReactNode;
  if (variant === 0) {
    // orbits
    art = (
      <g fill="none" stroke={deep} strokeOpacity="0.5">
        {[36, 72, 118, 172, 234].map((r, i) => (
          <circle key={r} cx={ox} cy={160} r={r} strokeWidth={i % 2 === 0 ? 2 : 1} />
        ))}
        <circle cx={ox} cy={160} r={12} fill={deep} fillOpacity={0.75} stroke="none" />
        <circle cx={ox + 118} cy={160} r={6} fill={deep} fillOpacity={0.6} stroke="none" />
      </g>
    );
  } else if (variant === 1) {
    // diagonal bands
    art = (
      <g fill={deep} fillOpacity="0.4">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={-80 + i * 190 + (h % 90)}
            y={-60}
            width={54 + (i % 2) * 30}
            height={460}
            rx={27}
            transform={`rotate(24 ${i * 190} 160)`}
            fillOpacity={0.22 + i * 0.09}
          />
        ))}
      </g>
    );
  } else {
    // dot grid
    const dots = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 12; c++) {
        const rad = 3 + ((h >>> ((r + c) % 13)) % 7);
        dots.push(
          <circle
            key={`${r}-${c}`}
            cx={40 + c * 66}
            cy={44 + r * 58}
            r={rad}
            fill={deep}
            fillOpacity={0.28 + (rad / 10) * 0.35}
          />,
        );
      }
    }
    art = <g>{dots}</g>;
  }

  return (
    <svg
      viewBox="0 0 800 320"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Auto-generated cover artwork (demo)"
      className={className}
    >
      <rect width="800" height="320" fill={light} />
      {art}
    </svg>
  );
}
