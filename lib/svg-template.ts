/**
 * Template v2 — the SVG is artwork, the config is the contract.
 *
 * The v1 builder asked the SVG to carry its own instructions: name every layer,
 * pick the right Object IDs mode, pick the right Styling mode. Four settings had
 * to be right and any one of them failed silently. This module removes that
 * contract entirely.
 *
 *   prepare()    Runs once, at upload. Reads the SVG's own <text> elements and
 *                fill colours through the real CSS cascade, then stamps stable
 *                data-tf / data-cs markers onto the nodes it found. It does NOT
 *                rewrite styling — the artwork still renders exactly as exported,
 *                whether that was Internal CSS, Inline Style, or Presentation
 *                Attributes. Nothing needs an id. Nothing needs a layer name.
 *
 *   composeSvg() Rebuilds finished artwork from a prepared SVG plus the values a
 *                customer typed. Overrides land in inline `style`, which beats
 *                both CSS classes and presentation attributes, so it works on any
 *                export mode without touching the original declarations.
 *
 * composeSvg is deliberately self-contained — no imports, no module scope. The
 * browser calls it directly for live preview, and the print renderer ships the
 * identical function into Puppeteer via page.evaluate. One implementation, so
 * what the customer saw and what reaches the printer cannot drift apart.
 *
 * The only rule left for the designer: don't outline your text.
 */

import type { TemplateTextField, TemplateColorSlot } from "./types";

/* ------------------------------------------------------------------ *
 * Shared helpers (build-time only — the browser runs these)
 * ------------------------------------------------------------------ */

/** Fills we cannot offer as a colour slot: gradients, patterns, "none". */
function isSwappableColor(v: string | null): v is string {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s !== "none" && s !== "transparent" && !s.startsWith("url(");
}

const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  yellow: "#ffff00",
  gray: "#808080",
  grey: "#808080",
};

/** Coerce a CSS colour into 7-char lowercase hex, or null if we can't. */
export function toHex(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (NAMED[v]) return NAMED[v];
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  const m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const hex = (n: string) =>
      Math.min(255, parseInt(n, 10)).toString(16).padStart(2, "0");
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }
  return null;
}

/** Pull one declaration out of a style="" string. */
function styleProp(style: string | null, prop: string): string | null {
  if (!style) return null;
  const m = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i"));
  return m ? m[1].trim() : null;
}

type CssMap = Record<string, Record<string, string>>;

/** Build class -> declarations from every <style> block in the document. */
function buildCssMap(doc: Document): CssMap {
  const map: CssMap = {};
  doc.querySelectorAll("style").forEach((el) => {
    const css = el.textContent ?? "";
    for (const rule of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const decls: Record<string, string> = {};
      for (const d of rule[2].split(";")) {
        const i = d.indexOf(":");
        if (i > 0) {
          decls[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim();
        }
      }
      for (const sel of rule[1].split(",")) {
        const s = sel.trim();
        if (s.startsWith(".")) {
          map[s.slice(1)] = { ...(map[s.slice(1)] ?? {}), ...decls };
        }
      }
    }
  });
  return map;
}

/**
 * Resolve a property the way a browser would: inline style beats a CSS class,
 * which beats a presentation attribute. Getting this order right is what lets
 * the builder read an Internal-CSS export as happily as a Presentation-
 * Attributes one.
 */
function effective(
  el: Element,
  prop: string,
  css: CssMap
): string | null {
  const inline = styleProp(el.getAttribute("style"), prop);
  if (inline) return inline;

  const classes = (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
  for (const c of classes) {
    const v = css[c]?.[prop];
    if (v) return v;
  }

  return el.getAttribute(prop);
}

/** "40px" | "40" | "2.5em" -> 40 | 40 | 0 */
function toPx(raw: string | null): number {
  if (!raw) return 0;
  const m = raw.trim().match(/^(-?[\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/** Strip quotes and fallbacks: "'Best Younglady Script', cursive" -> that name. */
function firstFamily(raw: string | null): string {
  if (!raw) return "";
  const first = raw.split(",")[0] ?? "";
  return first.trim().replace(/^['"]|['"]$/g, "");
}

/**
 * The tspans that actually hold a line of text: leaves (no child tspan) with
 * non-whitespace content. Skips the grouping tspans Illustrator wraps colour
 * runs in, and the stray-space tspans it emits for kerning. This is the ONE
 * definition of "a line" shared by extraction, compose and fit — they must all
 * agree, or the values, colours and positions drift apart.
 */
function leafLines(el: Element): Element[] {
  return Array.from(el.querySelectorAll("tspan")).filter(
    (t) => !t.querySelector("tspan") && (t.textContent ?? "").trim() !== ""
  );
}

/**
 * The fill a line actually paints in. SVG fill inherits, and Illustrator hangs
 * the colour on a GROUPING tspan (or the <text>) while the leaf that holds the
 * words carries none — so we walk up from the leaf to the <text> and take the
 * first fill that is set. This is what tells the greeting apart from the name.
 */
function inheritedFill(leaf: Element, textEl: Element, css: CssMap): string | null {
  let node: Element | null = leaf;
  while (node) {
    const f = effective(node, "fill", css);
    if (f) return f;
    if (node === textEl) break;
    node = node.parentElement;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * prepare — the whole upload-time story
 * ------------------------------------------------------------------ */

export type PreparedTemplate = {
  /** The original artwork with data-tf / data-cs markers added. Styling untouched. */
  preparedSvg: string;
  width: number;
  height: number;
  fileSizeKB: number;
  textFields: TemplateTextField[];
  colorSlots: TemplateColorSlot[];
  /**
   * Font families the artwork asks for. The builder makes the admin resolve each
   * one — to a Google family, or to a font file they upload.
   */
  detectedFonts: string[];
  /** Set when the file cannot work as a template at all. */
  fatal?: string;
};

export function prepareSvg(svgText: string): PreparedTemplate {
  const fileSizeKB = +(new Blob([svgText]).size / 1024).toFixed(1);

  const empty = (fatal: string): PreparedTemplate => ({
    preparedSvg: "",
    width: 0,
    height: 0,
    fileSizeKB,
    textFields: [],
    colorSlots: [],
    detectedFonts: [],
    fatal,
  });

  if (typeof DOMParser === "undefined") return empty("Must run in a browser");

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    const msg = doc.querySelector("parsererror")?.textContent?.split("\n")[0];
    return empty(msg || "Not a valid SVG");
  }

  const svg = doc.querySelector("svg");
  if (!svg) return empty("No <svg> root element");

  // Uploaded artwork gets inlined into the admin page and served to every
  // customer, so an SVG carrying script is a stored-XSS vector. Strip it here,
  // once, rather than trusting every consumer downstream to remember.
  doc.querySelectorAll("script").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const a of [...el.attributes]) {
      const name = a.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(a.name);
      if (
        (name === "href" || name === "xlink:href") &&
        a.value.trim().toLowerCase().startsWith("javascript:")
      ) {
        el.removeAttribute(a.name);
      }
    }
  });

  // Canvas size — viewBox first, then width/height.
  let width = 0;
  let height = 0;
  const vb = svg.getAttribute("viewBox");
  if (vb) {
    const p = vb.split(/[\s,]+/).map(Number);
    if (p.length === 4 && !p.some(Number.isNaN)) {
      width = p[2];
      height = p[3];
    }
  }
  if (!width) width = parseFloat(svg.getAttribute("width") ?? "0") || 800;
  if (!height) height = parseFloat(svg.getAttribute("height") ?? "0") || 800;

  const css = buildCssMap(doc);

  /* --- text fields: every <text>, no id required --------------------- */
  const textFields: TemplateTextField[] = [];
  const fontSet = new Set<string>();

  let tfCount = 0;
  doc.querySelectorAll("text").forEach((el) => {
    const family = firstFamily(effective(el, "font-family", css));
    if (family) fontSet.add(family);
    const textSize = toPx(effective(el, "font-size", css));

    // A line of text lives in a LEAF tspan (leafLines): grouping tspans just wrap
    // colour runs, and writing into one would delete its positioned children.
    const leaves = leafLines(el);

    // Bare <text> with no tspans — one field, marker on the element itself.
    if (leaves.length === 0) {
      const nodeId = `tf${tfCount++}`;
      el.setAttribute("data-tf", nodeId);
      const value = (el.textContent ?? "").replace(/\s+/g, " ").trim();
      const fillRaw = effective(el, "fill", css) ?? "#000000";
      textFields.push({
        nodeId,
        label: value.slice(0, 28) || `Text ${tfCount}`,
        editable: true,
        value,
        originalFont: family,
        fontFamily: "",
        fontSize: textSize || 16,
        fill: toHex(fillRaw) ?? "#000000",
      });
      return;
    }

    // Split the block into one field per CONTIGUOUS run of same-colour lines.
    // A greeting in white and a name in yellow become two independent fields —
    // separate boxes, locks, fonts and fitting — without the designer having to
    // author two <text> objects. A single-colour block is one run, so it stays a
    // single field exactly as before. The marker goes on the leaves of the run.
    const runs: { fill: string; leaves: Element[] }[] = [];
    for (const leaf of leaves) {
      const fill = toHex(inheritedFill(leaf, el, css) ?? "#000000") ?? "#000000";
      const last = runs[runs.length - 1];
      if (last && last.fill === fill) last.leaves.push(leaf);
      else runs.push({ fill, leaves: [leaf] });
    }

    for (const run of runs) {
      const nodeId = `tf${tfCount++}`;
      for (const leaf of run.leaves) leaf.setAttribute("data-tf", nodeId);
      const leafSize = toPx(effective(run.leaves[0], "font-size", css));
      const value = run.leaves.map((t) => (t.textContent ?? "").trim()).join("\n");
      textFields.push({
        nodeId,
        label: value.split("\n")[0].slice(0, 28) || `Text ${tfCount}`,
        editable: true,
        value,
        originalFont: family,
        // Left empty on purpose: the builder blocks publish until this maps to a
        // font the customer editor can fetch (Google, or an uploaded face).
        fontFamily: "",
        fontSize: leafSize || textSize || 16,
        fill: run.fill,
      });
    }
  });

  /* --- colour slots: group by fill value, not by element -------------- */
  const byColor = new Map<string, Element[]>();

  doc.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "svg" || tag === "style" || tag === "defs") return;
    const raw = effective(el, "fill", css);
    if (!isSwappableColor(raw)) return;
    const hex = toHex(raw);
    if (!hex) return;
    const list = byColor.get(hex) ?? [];
    list.push(el);
    byColor.set(hex, list);
  });

  const colorSlots: TemplateColorSlot[] = [...byColor.entries()]
    // Most-used colour first — that's almost always the one worth exposing.
    .sort((a, b) => b[1].length - a[1].length)
    .map(([hex, els], i) => {
      const nodeId = `cs${i}`;
      for (const el of els) {
        const existing = el.getAttribute("data-cs");
        el.setAttribute("data-cs", existing ? `${existing} ${nodeId}` : nodeId);
      }
      return {
        nodeId,
        label: `Colour ${i + 1}`,
        hex,
        exposed: false,
        count: els.length,
      };
    });

  const preparedSvg = new XMLSerializer().serializeToString(doc.documentElement);

  return {
    preparedSvg,
    width: Math.round(width),
    height: Math.round(height),
    fileSizeKB,
    textFields,
    colorSlots,
    detectedFonts: [...fontSet].sort(),
    fatal:
      textFields.length === 0
        ? "No <text> elements — the type was converted to outlines, so nothing can be made editable. Re-export from Illustrator with Font: SVG."
        : undefined,
  };
}

/* ------------------------------------------------------------------ *
 * compose — runs in the browser AND inside Puppeteer
 * ------------------------------------------------------------------ */

export type ComposeSpec = {
  textFields: Array<{
    nodeId: string;
    fontFamily: string;
    fontSize: number;
    fill: string;
    /**
     * The customer's alignment choice. composeSvg ignores it — aligning needs
     * real text metrics, so it is applied later by fitTextFields, which runs in
     * a rendered document. It rides along here so the screen and the print
     * renderer are handed one identical spec and cannot drift.
     */
    align?: "left" | "center" | "right";
    /** Text-area width (% of board). Like align, only fitTextFields reads it. */
    maxWidthPct?: number;
  }>;
  /** nodeId -> the text the customer typed. */
  textValues: Record<string, string>;
  /** nodeId -> the colour the customer picked. */
  colorValues: Record<string, string>;
};

/**
 * Rebuild finished artwork. Pure and dependency-free by contract: this exact
 * source is stringified into a Puppeteer page at print time, so it must not
 * reference anything outside its own body.
 */
export function composeSvg(svgText: string, spec: ComposeSpec): string {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = doc.documentElement;

  for (const field of spec.textFields) {
    // A field is marked either on a bare <text> element, or on the LEAF tspans of
    // one colour run (see prepareSvg). querySelectorAll returns exactly those.
    const nodes = Array.from(root.querySelectorAll(`[data-tf="${field.nodeId}"]`));
    if (!nodes.length) continue;

    // font-family is the ONLY thing we impose, because the admin may have remapped
    // the face or uploaded it and the artwork's own name may not resolve.
    // Everything else — fill, stroke, stroke-width, paint-order — is the designer's
    // work and survives untouched. Inline style, so it outranks class + attribute.
    if (field.fontFamily) {
      for (const n of nodes) {
        n.setAttribute(
          "style",
          `${n.getAttribute("style") ?? ""};font-family:'${field.fontFamily}'`.replace(
            /^;/,
            ""
          )
        );
      }
    }

    const value = spec.textValues[field.nodeId];
    if (value === undefined) continue;
    const lines = value.split("\n");

    // Bare <text>, no tspans. A single line stays as text content; multiple lines
    // become tspans so pressing Enter produces real lines, not spaces.
    const bare = nodes[0];
    if (
      nodes.length === 1 &&
      bare.tagName.toLowerCase() === "text" &&
      !bare.querySelector("tspan")
    ) {
      if (lines.length === 1) {
        bare.textContent = lines[0];
        continue;
      }
      const x = bare.getAttribute("x") ?? "0";
      const y0 = parseFloat(bare.getAttribute("y") ?? "0");
      const step = field.fontSize * 1.2;

      while (bare.firstChild) bare.removeChild(bare.firstChild);
      lines.forEach((line, i) => {
        const t = doc.createElementNS("http://www.w3.org/2000/svg", "tspan");
        t.setAttribute("x", x);
        t.setAttribute("y", String(y0 + step * i));
        t.textContent = line;
        bare.appendChild(t);
      });
      continue;
    }

    // Otherwise the nodes ARE the run's leaf tspans.
    const tspans = nodes;

    // Reuse the artwork's own leaf tspans. Each carries the designer's per-line
    // work — stroke, per-line fill, x/y — and rebuilding would drop all of it. So
    // swap only text into the leaf that already exists (preserving colour and
    // position exactly), clone the last leaf beside itself to grow, and blank the
    // surplus to shrink. Never write into a node we did not put text in before.
    const y0 = parseFloat(tspans[0].getAttribute("y") ?? "0");
    const step =
      tspans.length > 1
        ? parseFloat(tspans[1].getAttribute("y") ?? "0") - y0
        : field.fontSize * 1.2;
    const template = tspans[tspans.length - 1];

    lines.forEach((line, i) => {
      let t = tspans[i];
      if (!t) {
        // cloneNode(false): copies class/x/y (so colour follows), drops old text.
        t = template.cloneNode(false) as typeof template;
        t.setAttribute("y", String(y0 + step * i));
        (template.parentNode as Node).appendChild(t);
      }
      t.textContent = line;
    });

    // Fewer lines than authored: blank the extras rather than remove them, so a
    // grouping tspan is never left empty and reflowing back up stays lossless.
    for (let i = lines.length; i < tspans.length; i++) tspans[i].textContent = "";
  }

  for (const [nodeId, hex] of Object.entries(spec.colorValues)) {
    if (!hex) continue;
    root.querySelectorAll(`[data-cs~="${nodeId}"]`).forEach((el) => {
      el.setAttribute(
        "style",
        `${el.getAttribute("style") ?? ""};fill:${hex}`.replace(/^;/, "")
      );
    });
  }

  return new XMLSerializer().serializeToString(root);
}
