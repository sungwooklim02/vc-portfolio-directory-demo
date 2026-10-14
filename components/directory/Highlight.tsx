import type { ReactNode } from "react";

/** Render text with search-match ranges wrapped in <mark> (ranges are half-open, may overlap). */
export function Highlight({ text, ranges }: { text: string; ranges?: Array<[number, number]> }): ReactNode {
  if (!ranges || ranges.length === 0) return text;
  const merged = [...ranges]
    .map(([a, b]) => [Math.max(0, a), Math.min(text.length, b)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0])
    .reduce<Array<[number, number]>>((acc, r) => {
      const last = acc[acc.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else acc.push([...r]);
      return acc;
    }, []);
  const out: ReactNode[] = [];
  let at = 0;
  merged.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a));
    out.push(
      <mark key={i} className="vpd-mark">
        {text.slice(a, b)}
      </mark>,
    );
    at = b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}
