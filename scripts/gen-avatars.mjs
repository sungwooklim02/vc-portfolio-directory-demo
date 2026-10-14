/**
 * gen-avatars.mjs — illustrated avatars for the five FICTIONAL team members on the About page.
 *
 * Style: "Notionists" by Zoish, CC0 1.0, rendered through DiceBear (MIT) — line illustrations,
 * deliberately not photographs, so they cannot be mistaken for real people.
 * Licence verified at https://www.dicebear.com/licenses/ (2026-10-14/15). Credits: public/img/CREDITS.md
 *
 * Output: public/img/team/<slug>.svg (static, sanitised: no <metadata>, no scripts, no external refs).
 * Deterministic: seed = the fictional name, so every build writes the same files.
 */
import { createAvatar } from "@dicebear/core";
import * as notionists from "@dicebear/notionists";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "img", "team");

// keep in sync with TEAM in components/views/AboutView.tsx (verify-uplift checks every file exists)
export const TEAM_AVATARS = [
  { slug: "mira-valserin", seed: "Mira Valserin", bg: "dde3ea" },
  { slug: "teo-marchen", seed: "Teo Marchen", bg: "dbe4dd" },
  { slug: "suah-linderel", seed: "Suah Linderel", bg: "e8dee6" },
  { slug: "anik-verolst", seed: "Anik Verolst", bg: "e9e2d0" },
  { slug: "rhea-ostrelin", seed: "Rhea Ostrelin", bg: "eadedc" },
];

function sanitise(svg) {
  let s = svg
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "")
    .replace(/\s+xmlns:(dc|cc|rdf)="[^"]*"/g, "");
  if (/<script|<foreignObject|href="http|xlink:href="http|url\(http/i.test(s)) throw new Error("unsafe avatar svg");
  return s;
}

mkdirSync(OUT, { recursive: true });
for (const n of readdirSync(OUT)) if (n.endsWith(".svg")) unlinkSync(join(OUT, n));
for (const p of TEAM_AVATARS) {
  const svg = createAvatar(notionists, {
    seed: p.seed,
    size: 96,
    backgroundColor: [p.bg],
    scale: 138,
    translateY: 10,
    // calm, professional variants only: closed/soft smiles, no gestures, no sunglasses, no novelty badges, no hats
    lips: ["variant03", "variant14", "variant22", "variant23", "variant25", "variant30"],
    gestureProbability: 0,
    glassesProbability: 0,
    bodyIconProbability: 0,
    hair: notionists.schema.properties.hair.default.filter((h) => h !== "hat"),
  }).toString();
  writeFileSync(join(OUT, `${p.slug}.svg`), sanitise(svg) + "\n", "utf8");
}
console.log(`avatars: ${TEAM_AVATARS.length} -> public/img/team/`);
