import { coverInfo } from "@/lib/covers";
import type { Locale } from "@/lib/i18n";
import { withBase } from "@/lib/site";

/**
 * Detail-page cover: a licensed stock photo chosen per sector (data/companies.json `cover`), served from
 * public/img/covers as AVIF with a WebP fallback, two crops (1600×560 wide, 800×400 phone). Fixed aspect
 * ratio + tinted background so nothing shifts while it loads. The photo is atmosphere only — the caption
 * says it does not show the (fictional) company. Credits: public/img/CREDITS.md.
 */
export function CoverPhoto({ id, locale, className }: { id: string; locale: Locale; className?: string }) {
  const info = coverInfo(id);
  const src = (w: number, ext: string) => withBase(`/img/covers/${id}-${w}.${ext}`);
  return (
    <picture className={`vpd-cover block overflow-hidden ${className ?? ""}`} style={{ backgroundColor: info.tone }}>
      <source type="image/avif" srcSet={`${src(800, "avif")} 800w, ${src(1600, "avif")} 1600w`} sizes="(min-width: 896px) 848px, 100vw" />
      <img
        src={src(1600, "webp")}
        srcSet={`${src(800, "webp")} 800w, ${src(1600, "webp")} 1600w`}
        sizes="(min-width: 896px) 848px, 100vw"
        width={1600}
        height={560}
        alt={info.alt[locale]}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        data-cover-photo={id}
        className="h-full w-full object-cover"
        style={{ objectPosition: info.focus }}
      />
    </picture>
  );
}
