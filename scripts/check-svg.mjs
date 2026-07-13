#!/usr/bin/env node
/**
 * Diagnose an Illustrator SVG export before uploading it to the builder.
 *
 * Reports exactly what lib/svg-parser.ts will see, and names the Illustrator
 * setting to change when something is missing.
 *
 * Usage:
 *   node scripts/check-svg.mjs path/to/template.svg
 */

import { readFileSync } from "node:fs";

// Mirrors NON_VISUAL_TAGS in lib/svg-parser.ts — these are skipped by the parser.
const NON_VISUAL = new Set([
  "defs", "metadata", "style", "title", "desc", "clippath", "mask", "pattern",
  "lineargradient", "radialgradient", "stop", "filter", "fegaussianblur",
  "fecolormatrix", "feoffset", "femerge", "femergenode", "feblend",
  "fecomposite", "marker", "symbol", "use",
]);

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/check-svg.mjs path/to/template.svg");
  process.exit(1);
}

const svg = readFileSync(file, "utf-8").replace(/<!--[\s\S]*?-->/g, "");

const attr = (raw, name) => {
  const m = raw.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
};

// Every element, with its attributes.
const tags = [...svg.matchAll(/<([a-zA-Z][\w:-]*)((?:\s[^>]*)?)\/?>/g)].map((m) => ({
  tag: m[1].toLowerCase(),
  raw: m[2] || "",
}));

const visual = tags.filter((t) => t.tag !== "svg" && !NON_VISUAL.has(t.tag));
const named = visual.filter((t) => attr(t.raw, "id"));

// Which fills live in CSS rather than on the element (the COLOR-permission killer).
const styleBlocks = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
const cssFillClasses = new Set();
for (const css of styleBlocks) {
  for (const m of css.matchAll(/\.([\w-]+)\s*\{[^}]*\bfill\s*:/gi)) cssFillClasses.add(m[1]);
}

const textEls = visual.filter((t) => t.tag === "text" || t.tag === "tspan");
const withFillAttr = named.filter((t) => attr(t.raw, "fill") !== null);
const inlineStyleFill = named.filter((t) => /fill\s*:/i.test(attr(t.raw, "style") || ""));
const cssFillOnly = named.filter((t) => {
  if (attr(t.raw, "fill") !== null) return false;
  const cls = (attr(t.raw, "class") || "").split(/\s+/);
  return cls.some((c) => cssFillClasses.has(c));
});

const pathCount = visual.filter((t) => t.tag === "path").length;
const problems = [];

console.log(`\n  ${file}\n  ${"─".repeat(58)}`);
console.log(`  Elements (visual)   ${visual.length}`);
console.log(`  With an id          ${named.length}`);
console.log(`  <text> / <tspan>    ${textEls.length}`);
console.log(`  <path>              ${pathCount}`);
console.log(`  Fills as attribute  ${withFillAttr.length}   (COLOR permission needs this)`);
if (cssFillOnly.length) console.log(`  Fills in <style>    ${cssFillOnly.length}   ← invisible to the parser`);
if (inlineStyleFill.length) console.log(`  Fills inline-style  ${inlineStyleFill.length}   ← invisible to the parser`);

if (named.length === 0) {
  problems.push([
    "No element has an id — the builder will show “0 named elements”.",
    "Illustrator only writes an id for objects you RENAMED in the Layers panel.",
    "Default italic names (<Path>, <Group>, <Rectangle>) produce no id.",
    "Fix: double-click each object in the Layers panel, give it a real name,",
    "     then re-export with Object IDs: Layer Names and Minify OFF.",
  ]);
} else {
  console.log(`\n  Named elements the builder will list:`);
  for (const t of named) {
    const id = attr(t.raw, "id");
    const isText = t.tag === "text" || t.tag === "tspan";
    const canColor = attr(t.raw, "fill") !== null;
    const perms = ["LOCKED", isText && "TEXT", canColor && "COLOR"].filter(Boolean);
    console.log(`    <${t.tag}> #${id}`.padEnd(42) + perms.join(" | "));
  }
}

if (textEls.length === 0 && pathCount > 0) {
  problems.push([
    "Zero <text> elements but " + pathCount + " <path> — your text was converted to outlines.",
    "No TEXT permission is possible; customers cannot retype anything.",
    "Fix: re-export with Font: SVG (not “Convert to outlines”).",
  ]);
}

if (cssFillOnly.length > 0 || inlineStyleFill.length > 0) {
  problems.push([
    "Fills live in CSS, not on the elements. The COLOR toggle will never appear",
    "because the parser checks el.hasAttribute(“fill”).",
    "Fix: re-export with Styling: Presentation Attributes",
    "     (not “Internal CSS” and not “Inline Style”).",
  ]);
}

if (!/viewBox\s*=/i.test(svg)) {
  problems.push([
    "No viewBox on the root <svg> — canvas size falls back to 800×800.",
    "Fix: tick “Responsive” in the SVG Options dialog.",
  ]);
}

const dupes = named.map((t) => attr(t.raw, "id")).filter((id, i, a) => a.indexOf(id) !== i);
if (dupes.length) {
  problems.push([`Duplicate ids: ${[...new Set(dupes)].join(", ")} — rename so each is unique.`]);
}

console.log("");
if (problems.length === 0) {
  console.log("  ✓ Ready to upload.\n");
} else {
  for (const p of problems) {
    console.log("  ✕ " + p[0]);
    for (const line of p.slice(1)) console.log("    " + line);
    console.log("");
  }
  process.exitCode = 1;
}
