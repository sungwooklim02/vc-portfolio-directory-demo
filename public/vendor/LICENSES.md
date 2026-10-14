# Third-party code, data and fonts shipped by this site

Everything below is served from this site itself (`/vendor`, `/fonts`, `/_next/static`); the pages make
no runtime requests to other hosts. The libraries added for the 2026-10 uplift are pinned exactly in
`package.json`; framework versions below are the ones locked in `package-lock.json`.
Full licence texts are in [`licenses/`](./licenses/) (copied from each package by `scripts/build-assets.mjs`).

## Loaded by the browser

| Package | Version | Licence | Where it ships | Used for | Source |
|---|---|---|---|---|---|
| three | 0.186.1 | MIT | `vendor/three-lite-0.186.1.min.js` (core subset + OrbitControls, loaded on idle after first paint) | 3D portfolio orbit in the home hero | https://github.com/mrdoob/three.js |
| echarts | 6.1.0 | Apache-2.0 (+ `licenses/echarts-NOTICE.txt`) | `vendor/echarts-lite-6.1.0.min.js` (core + bar/scatter/effectScatter, geo/grid/tooltip/aria, label layout, SVG renderer; loaded when the map view opens) | Map view and its two charts | https://github.com/apache/echarts |
| zrender | 6.1.0 | BSD-3-Clause | inside the ECharts bundle | ECharts rendering engine | https://github.com/ecomfe/zrender |
| tslib | 2.8.1 | 0BSD | inside the ECharts bundle | ECharts helper runtime | https://github.com/microsoft/tslib |
| topojson-client | 3.1.0 | ISC | inside the ECharts bundle | TopoJSON → GeoJSON for the local world map | https://github.com/topojson/topojson-client |
| world-atlas | 2.0.2 | ISC (data from Natural Earth, public domain) | `vendor/geo/countries-110m-2.0.2.json` | World map shapes (local file; no tile server, no geocoding API) | https://github.com/topojson/world-atlas |
| fuse.js | 7.5.0 | Apache-2.0 | Next.js chunk, loaded on first focus of the search box | Fuzzy search | https://github.com/krisk/Fuse |
| es-hangul | 2.4.0 | MIT | Next.js chunk, loaded with the search engine | Korean initial-consonant search, typo correction (keyboard layout), particles | https://github.com/toss/es-hangul |
| lucide-react | 1.56.0 | ISC | Next.js chunks (only the imported icons) | Icon set | https://github.com/lucide-icons/lucide |
| Pretendard (modified as "Renewal Sans") | 1.3.9 | SIL OFL 1.1 | `fonts/rs-*.woff2` | Webfont — see `fonts/FONT-LICENSES.md` and `fonts/OFL.txt` | https://github.com/orioncactus/pretendard |
| next / react / react-dom | 15.5.20 / 19.2.7 | MIT | `_next/static` | Framework (unchanged from the original build) | https://github.com/vercel/next.js · https://github.com/facebook/react |

## Build-time only (not shipped)

| Package | Version | Licence | Used for | Source |
|---|---|---|---|---|
| esbuild | 0.28.2 | MIT | Building the two vendor bundles | https://github.com/evanw/esbuild |
| subset-font | 2.9.0 | BSD-3-Clause | Font subsetting (HarfBuzz) | https://github.com/papandreou/subset-font |
| harfbuzzjs | 1.6.3 | MIT | (dependency of subset-font) | https://github.com/harfbuzz/harfbuzzjs |
| fontverter | 2.0.0 | BSD-3-Clause | sfnt ↔ woff2 conversion | https://github.com/odensc/fontverter |
| wawoff2 | 2.0.1 | MIT | (dependency of fontverter) | https://github.com/fontello/wawoff2 |
| @types/three | 0.186.0 | MIT | Type definitions | https://github.com/three-types/three-ts-types |
