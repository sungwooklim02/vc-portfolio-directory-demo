// node --test scripts/test-search.mjs — directory search regression (real Fuse.js basic + es-hangul).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import Fuse from "fuse.js/basic";
import { convertQwertyToHangul, disassemble, getChoseong } from "es-hangul";
import { createSearcher, plainMatch } from "../lib/search-core.mjs";

const data = JSON.parse(readFileSync(new URL("../data/companies.json", import.meta.url), "utf8"));
const docsFor = (locale) =>
  data.companies.map((c) => ({
    slug: c.slug,
    name: c.name,
    ...(locale === "ko" ? { koName: c.koName } : {}),
    oneLiner: c[locale].oneLiner,
    sectorLabel: data.sectors.find((s) => s.id === c.sector)[locale],
    city: c.location[locale],
  }));
const deps = { Fuse, getChoseong, disassemble, convertQwertyToHangul };
const ko = createSearcher(deps, docsFor("ko"), "ko");
const en = createSearcher(deps, docsFor("en"), "en");
const inCity = (id) => new Set(data.companies.filter((c) => c.location.id === id).map((c) => c.slug));

test("empty query does not filter", () => {
  assert.equal(ko.search("   "), null);
});

test("choseong: ㄹㅈㄹ finds 레저린 (ledgerine) first, highlighted in the Korean name", () => {
  const r = ko.search("ㄹㅈㄹ");
  assert.equal(r.slugs[0], "ledgerine");
  assert.deepEqual(r.marks.ledgerine.koName, [[0, 3]]);
});

test("composing syllable: 레ㅈ finds ledgerine", () => {
  const r = ko.search("레ㅈ");
  assert.equal(r.slugs[0], "ledgerine");
});

test("Korean typed on an English keyboard: fpwjfls suggests 레저린", () => {
  const r = ko.search("fpwjfls");
  assert.equal(r.slugs.length, 0);
  assert.equal(r.suggestion?.kind, "qwerty");
  assert.equal(r.suggestion?.query, "레저린");
  assert.equal(r.suggestion?.slug, "ledgerine");
});

test("typo/partial: ledgerin ranks Ledgerine first (EN and KO pages)", () => {
  assert.equal(en.search("ledgerin").slugs[0], "ledgerine");
  assert.equal(ko.search("ledgerin").slugs[0], "ledgerine");
  assert.equal(en.search("ledgerne").slugs[0], "ledgerine");
});

test("city: berlin / 베를린 return Berlin companies only", () => {
  const berlin = inCity("berlin");
  assert.ok(berlin.size > 0);
  const a = en.search("berlin").slugs;
  assert.deepEqual(new Set(a), berlin);
  const b = ko.search("베를린").slugs;
  assert.deepEqual(new Set(b), berlin);
});

test("sector label search: 핀테크 returns fintech companies", () => {
  const fin = new Set(data.companies.filter((c) => c.sector === "fintech").map((c) => c.slug));
  const r = ko.search("핀테크").slugs;
  for (const s of fin) assert.ok(r.includes(s), `missing ${s}`);
});

test("nonsense: zzzz returns nothing (and at most a closest-name suggestion)", () => {
  const r = en.search("zzzz");
  assert.equal(r.slugs.length, 0);
  assert.notEqual(r.suggestion?.kind, "qwerty");
});

test("plain fallback filter keeps the original substring behaviour", () => {
  const d = docsFor("ko").find((x) => x.slug === "ledgerine");
  assert.ok(plainMatch(d, "레저"));
  assert.ok(plainMatch(d, "LEDGER"));
  assert.ok(!plainMatch(d, "zzzz"));
});
