# Vendor bundles

`npm run build` (and `npm run dev`) run `scripts/build-assets.mjs`, which rebuilds everything below from
the exact versions in `package.json`. Nothing is downloaded at build or run time.

| Output (gitignored) | Entry | Global | Loaded |
|---|---|---|---|
| `public/vendor/three-lite-<three version>.min.js` | `three.entry.js` | `THREE_LITE` | on idle after hydration, home page only (`components/PortfolioOrbit.tsx`) |
| `public/vendor/echarts-lite-<echarts version>.min.js` | `echarts.entry.js` | `ECHARTS_LITE` | when the map view opens (`components/directory/MapView.tsx`) |
| `public/vendor/geo/countries-110m-<world-atlas version>.json` | copy of `world-atlas/countries-110m.json` | — | with the map view |

The client reads the file names from `lib/vendor.generated.ts` (also generated), so a version bump only
needs `npm install` + `npm run build`.

Reproduce one bundle by hand (same flags as the build; the build also adds a one-line licence banner):

```sh
npx esbuild scripts/vendor/three.entry.js --bundle --format=iife --global-name=THREE_LITE \
  --minify --legal-comments=none --target=es2020 --define:process.env.NODE_ENV='"production"' \
  --outfile=public/vendor/three-lite-0.186.1.min.js
npx esbuild scripts/vendor/echarts.entry.js --bundle --format=iife --global-name=ECHARTS_LITE \
  --minify --legal-comments=none --target=es2020 --define:process.env.NODE_ENV='"production"' \
  --outfile=public/vendor/echarts-lite-6.1.0.min.js
```

Measure (gzip level 9, Node zlib): `npm run verify` prints the first-screen and total JS budgets.
Licences: `public/vendor/LICENSES.md`.
