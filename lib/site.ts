export const SITE_ORIGIN = "https://sungwooklim02.github.io";
export const BASE_PATH = "/vc-portfolio-directory-demo";
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;
export const REPO_URL = "https://github.com/sungwooklim02/vc-portfolio-directory-demo";
export const SITE_NAME_EN = "Velmara Ventures [DEMO]";
export const SITE_NAME_KO = "벨마라 벤처스 [데모]";

/** Absolute URL for a site path ("/", "/companies/x/", "/ko/about/", ...). */
export function abs(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Prefix a public asset path with the basePath (for plain <link>/<img> tags). */
export function withBase(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Map an EN path to its KO counterpart ("/" -> "/ko/", "/about/" -> "/ko/about/"). */
export function koPath(enPath: string): string {
  return enPath === "/" ? "/ko/" : `/ko${enPath}`;
}
