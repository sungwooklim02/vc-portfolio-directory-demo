// @ts-check
/**
 * search-core.mjs — directory search logic, framework-free so `node --test scripts/test-search.mjs` runs it
 * with the real libraries. The browser loads Fuse.js (basic build) and es-hangul lazily on first focus of
 * the search box and passes them in; until then the directory keeps its plain substring filter.
 *
 * Query routes:
 *   1. all Hangul consonants ("ㄹㅈㄹ")      -> initial-consonant (choseong) match on the Korean name/city/sector
 *   2. contains Hangul ("레ㅈ", "베를린")    -> jamo-disassembled prefix/substring match + Fuse
 *   3. Latin ("ledgerin", "berlin")           -> weighted fuzzy match (Fuse) + exact-substring boost
 * When nothing matches: on Korean pages a Latin query is re-read as Korean typed on an English keyboard
 * ("fpwjfls" -> "레저린") and offered as "did you mean"; otherwise the closest company name is offered.
 */

/**
 * @typedef {{ slug: string, name: string, koName?: string, oneLiner: string, sectorLabel: string, city: string }} SearchDoc
 * @typedef {[number, number]} Range  half-open [start, end) in UTF-16 units
 * @typedef {{ name?: Range[], koName?: Range[], oneLiner?: Range[] }} Marks
 * @typedef {{ kind: "qwerty" | "closest", query: string, slug: string, label: string }} Suggestion
 * @typedef {{ slugs: string[], marks: Record<string, Marks>, suggestion: Suggestion | null }} SearchResult
 * @typedef {{
 *   Fuse: any,
 *   getChoseong: (s: string) => string,
 *   disassemble: (s: string) => string,
 *   convertQwertyToHangul: (s: string) => string,
 * }} SearchDeps
 */

const HANGUL = /[가-힣ㄱ-ㅣ]/;
const ONLY_CHOSEONG = /^[ㄱ-ㅎ\s]+$/;
const LATIN_ONLY = /^[a-z\s]+$/i;

/** @param {string} s */
export function normalize(s) {
  return s.normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Per-character transform with an index map back to the source string, so a match in the transformed text
 * (choseong or jamo) can be highlighted in the original.
 * @param {string} text
 * @param {(ch: string) => string} fn
 */
function mapped(text, fn) {
  let out = "";
  /** @type {number[]} */
  const src = [];
  for (let i = 0; i < text.length; i++) {
    const t = fn(text[i]);
    for (let k = 0; k < t.length; k++) src.push(i);
    out += t;
  }
  return { out, src };
}

/** @param {{out: string, src: number[]}} m @param {string} needle @returns {Range | null} */
function findMapped(m, needle) {
  const at = m.out.indexOf(needle);
  if (at < 0 || !needle) return null;
  return [m.src[at], m.src[at + needle.length - 1] + 1];
}

/** @param {string} hay @param {string} needle @returns {Range | null} */
function findPlain(hay, needle) {
  const at = hay.toLowerCase().indexOf(needle);
  return at < 0 || !needle ? null : [at, at + needle.length];
}

/**
 * @param {SearchDeps} deps
 * @param {SearchDoc[]} docs
 * @param {"en" | "ko"} locale
 */
export function createSearcher(deps, docs, locale) {
  const { Fuse, getChoseong, disassemble, convertQwertyToHangul } = deps;
  const cho = (/** @type {string} */ ch) => (/[가-힣]/.test(ch) ? getChoseong(ch) : ch === " " ? " " : "");
  const jam = (/** @type {string} */ ch) => (HANGUL.test(ch) ? disassemble(ch) : ch.toLowerCase());

  const index = docs.map((d, i) => ({
    d,
    i,
    nameL: d.name.toLowerCase(),
    koCho: d.koName ? mapped(d.koName, cho) : null,
    koJam: d.koName ? mapped(d.koName, jam) : null,
    sectorCho: getChoseong(d.sectorLabel),
    cityCho: getChoseong(d.city),
    sectorJam: disassemble(d.sectorLabel.toLowerCase()),
    cityJam: disassemble(d.city.toLowerCase()),
    oneJam: mapped(d.oneLiner, jam),
  }));

  const keys = [
    { name: "name", weight: 0.4 },
    { name: "koName", weight: 0.3 },
    { name: "sectorLabel", weight: 0.1 },
    { name: "city", weight: 0.1 },
    { name: "oneLiner", weight: 0.1 },
  ];
  const fuse = new Fuse(docs, { keys, threshold: 0.32, ignoreLocation: true, includeScore: true, includeMatches: true, minMatchCharLength: 2 });
  const loose = new Fuse(docs, { keys: ["name", "koName"], threshold: 0.6, ignoreLocation: true, includeScore: true });

  /**
   * @param {string} q normalized query
   * @returns {Map<string, { score: number, i: number, marks: Marks, exact: boolean }>}
   */
  function run(q) {
    /** @type {Map<string, { score: number, i: number, marks: Marks, exact: boolean }>} */
    const hits = new Map();
    const add = (/** @type {typeof index[number]} */ e, /** @type {number} */ score, /** @type {Marks} */ marks, exact = true) => {
      const prev = hits.get(e.d.slug);
      if (!prev || score < prev.score)
        hits.set(e.d.slug, { score, i: e.i, marks: { ...(prev?.marks ?? {}), ...marks }, exact: exact || !!prev?.exact });
      else if (exact) prev.exact = true;
    };

    if (ONLY_CHOSEONG.test(q)) {
      const needle = q.replace(/\s+/g, "");
      for (const e of index) {
        if (e.koCho) {
          const flat = { out: e.koCho.out.replace(/ /g, ""), src: e.koCho.src.filter((_, k) => e.koCho?.out[k] !== " ") };
          const r = findMapped(flat, needle);
          if (r) {
            add(e, flat.out.startsWith(needle) ? 0 : 0.08, { koName: [r] });
            continue;
          }
        }
        if (e.sectorCho.replace(/ /g, "").includes(needle) || e.cityCho.replace(/ /g, "").includes(needle)) add(e, 0.2, {});
      }
      return hits;
    }

    if (HANGUL.test(q)) {
      const dq = disassemble(q);
      for (const e of index) {
        const rk = e.koJam ? findMapped(e.koJam, dq) : null;
        if (rk) {
          add(e, e.koJam?.out.startsWith(dq) ? 0 : 0.05, { koName: [rk] });
          continue;
        }
        if (e.sectorJam.includes(dq) || e.cityJam.includes(dq)) {
          add(e, 0.12, {});
          continue;
        }
        const ro = findMapped(e.oneJam, dq);
        if (ro) add(e, 0.25, { oneLiner: [ro] });
      }
    }

    // fuzzy (all scripts) — adds typo tolerance on top of the exact routes above
    for (const r of fuse.search(q)) {
      const e = index[r.refIndex];
      /** @type {Marks} */
      const marks = {};
      for (const m of r.matches ?? []) {
        if (m.key !== "name" && m.key !== "koName" && m.key !== "oneLiner") continue;
        const field = /** @type {"name" | "koName" | "oneLiner"} */ (m.key);
        const exact = findPlain(String(m.value ?? ""), q);
        const ranges = exact ? [exact] : m.indices.filter((/** @type {Range} */ x) => x[1] - x[0] >= 1).map((/** @type {Range} */ x) => /** @type {Range} */ ([x[0], x[1] + 1]));
        if (ranges.length) marks[field] = ranges;
      }
      let score = r.score ?? 1;
      if (e.nameL.startsWith(q)) score = Math.min(score, 0);
      else if (e.nameL.includes(q)) score = Math.min(score, 0.02);
      const d = e.d;
      const exact = [d.name, d.koName ?? "", d.sectorLabel, d.city, d.oneLiner].some((f) => f.toLowerCase().includes(q));
      add(e, score, marks, exact);
    }

    // precision: when some companies contain the query as typed, fuzzy look-alikes are noise — keep exact hits only.
    // Typo tolerance still applies whenever nothing matches exactly ("ledgerne" -> Ledgerine).
    if ([...hits.values()].some((h) => h.exact)) for (const [k, h] of hits) if (!h.exact) hits.delete(k);
    return hits;
  }

  /**
   * @param {string} raw
   * @returns {SearchResult | null} null = empty query (no filtering)
   */
  function search(raw) {
    const q = normalize(raw);
    if (!q) return null;
    const hits = run(q);
    const ordered = [...hits.entries()].sort((a, b) => a[1].score - b[1].score || a[1].i - b[1].i);
    /** @type {SearchResult} */
    const res = { slugs: ordered.map(([slug]) => slug), marks: Object.fromEntries(ordered.map(([slug, h]) => [slug, h.marks])), suggestion: null };
    if (res.slugs.length) return res;

    if (locale === "ko" && LATIN_ONLY.test(q)) {
      const hq = convertQwertyToHangul(q.replace(/\s+/g, ""));
      if (HANGUL.test(hq)) {
        const alt = [...run(normalize(hq)).entries()].sort((a, b) => a[1].score - b[1].score || a[1].i - b[1].i);
        if (alt.length) {
          const top = docs[alt[0][1].i];
          res.suggestion = { kind: "qwerty", query: hq, slug: top.slug, label: top.koName ?? top.name };
          return res;
        }
      }
    }
    const close = loose.search(q)[0];
    if (close) {
      const top = docs[close.refIndex];
      res.suggestion = { kind: "closest", query: locale === "ko" && top.koName ? top.koName : top.name, slug: top.slug, label: locale === "ko" && top.koName ? top.koName : top.name };
    }
    return res;
  }

  return { search };
}

/** Plain substring filter used before the libraries load (same behaviour as the original directory). */
/** @param {SearchDoc} d @param {string} raw */
export function plainMatch(d, raw) {
  const q = normalize(raw);
  if (!q) return true;
  return `${d.name} ${d.koName ?? ""} ${d.oneLiner} ${d.sectorLabel} ${d.city}`.toLowerCase().includes(q);
}
