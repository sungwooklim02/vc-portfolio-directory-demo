import type { Metadata } from "next";
import type { Locale } from "./i18n";
import { abs, koPath, SITE_NAME_EN, SITE_NAME_KO } from "./site";

/**
 * Page metadata with hreflang cross-references (en / ko / x-default),
 * canonical, and og:locale. `enPath` is the EN path ("/", "/about/", ...).
 * All URLs are absolute so view-source verification is unambiguous.
 */
export function pageMeta(
  locale: Locale,
  enPath: string,
  title: string,
  description: string,
): Metadata {
  const enUrl = abs(enPath);
  const koUrl = abs(koPath(enPath));
  const self = locale === "en" ? enUrl : koUrl;
  return {
    title,
    description,
    alternates: {
      canonical: self,
      languages: {
        en: enUrl,
        ko: koUrl,
        "x-default": enUrl,
      },
    },
    openGraph: {
      title,
      description,
      url: self,
      siteName: locale === "en" ? SITE_NAME_EN : SITE_NAME_KO,
      locale: locale === "en" ? "en_US" : "ko_KR",
      alternateLocale: locale === "en" ? ["ko_KR"] : ["en_US"],
      type: "website",
    },
  };
}
