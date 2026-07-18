import type { MetadataRoute } from "next";
import { companies } from "@/lib/companies";
import { abs, koPath } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const enPaths = ["/", "/about/", "/demo/", ...companies.map((c) => `/companies/${c.slug}/`)];
  const entries: MetadataRoute.Sitemap = [];
  for (const p of enPaths) {
    const enUrl = abs(p);
    const koUrl = abs(koPath(p));
    const languages = { en: enUrl, ko: koUrl, "x-default": enUrl };
    entries.push({
      url: enUrl,
      changeFrequency: "monthly",
      priority: p === "/" ? 1 : 0.6,
      alternates: { languages },
    });
    entries.push({
      url: koUrl,
      changeFrequency: "monthly",
      priority: p === "/" ? 0.9 : 0.5,
      alternates: { languages },
    });
  }
  return entries;
}
