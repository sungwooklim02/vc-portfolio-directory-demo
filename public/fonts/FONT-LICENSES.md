# Font licence

The site ships one typeface, served from this folder (no font CDN, no runtime requests elsewhere).

| Shipped files | Family name in CSS | Based on | Licence |
|---|---|---|---|
| `rs-latin-*.woff2`, `rs-kr-en-*.woff2`, `rs-kr-site-*.woff2`, `rs-kr-rest-*.woff2` | `Renewal Sans` | Pretendard 1.3.9, variable (`PretendardVariable.woff2`, font revision 1.309) | SIL Open Font License 1.1 — full text in [`OFL.txt`](./OFL.txt) |

Original copyright: Copyright (c) 2021, Kil Hyung-jin (https://github.com/orioncactus/pretendard),
with Reserved Font Name Pretendard.

## Modified Version

The four files are a **Modified Version** under the OFL:

- **Subsetted** with HarfBuzz (`subset-font`) into four `unicode-range` chunks — Latin, the few Hangul
  glyphs the English pages use, the Hangul the site's own text uses, and the rest of KS X 1001 Hangul
  (so search input and user-typed text still render). The variable weight axis (`fvar`) is kept.
- **Renamed** to `Renewal Sans`, because "Pretendard" is a Reserved Font Name and the OFL does not allow
  a Modified Version to carry it. The copyright notice (name ID 0), licence description and URLs
  (name IDs 13–14) are kept as in the original.

Source file: `scripts/fonts/src/PretendardVariable.woff2`,
SHA-256 `9599f12fd42fc0bce1cd50b47a0c022e108d7aa64dd0d1bb0ed44f3282d900b4`.
The build (`scripts/fonts/build-fonts.mjs`, run by `npm run build`) regenerates the chunks and
`app/fonts.generated.css`; file names carry a content hash.
