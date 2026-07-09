/**
 * SVG parser used by the template builder. Browser-only (uses DOMParser).
 * Returns validation results plus a flat list of named elements that are
 * candidates for permission editing.
 */

export type SvgElementInfo = {
  id: string;
  tagName: string;
  isText: boolean;
  hasFillAttr: boolean;
  textContent: string;
  fill: string;
};

export type SvgValidation = {
  valid: boolean;
  parseError?: string;
  fileSizeKB: number;
  width: number;
  height: number;
  elementCount: number;
  textElementCount: number;
  elements: SvgElementInfo[];
  fonts: string[];
};

/**
 * Parse a CSS font-family value into a list of clean font names.
 * Strips quotes, splits on commas, filters generic keywords.
 */
function parseFontFamily(raw: string): string[] {
  if (!raw) return [];
  const generic = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "math",
    "emoji",
    "fangsong",
    "inherit",
    "initial",
    "unset",
  ]);
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
    .filter((s) => s.length > 0 && !generic.has(s.toLowerCase()));
}

const NON_VISUAL_TAGS = new Set([
  "defs",
  "metadata",
  "style",
  "title",
  "desc",
  "clippath",
  "mask",
  "pattern",
  "lineargradient",
  "radialgradient",
  "stop",
  "filter",
  "fegaussianblur",
  "fecolormatrix",
  "feoffset",
  "femerge",
  "femergenode",
  "feblend",
  "fecomposite",
  "marker",
  "symbol",
  "use",
]);

export function parseSvg(svgText: string): SvgValidation {
  const fileSizeKB = +(new Blob([svgText]).size / 1024).toFixed(1);

  if (typeof DOMParser === "undefined") {
    return {
      valid: false,
      parseError: "DOMParser unavailable (must run in browser)",
      fileSizeKB,
      width: 0,
      height: 0,
      elementCount: 0,
      textElementCount: 0,
      elements: [],
      fonts: [],
    };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    return {
      valid: false,
      parseError: parserError.textContent?.split("\n")[0] ?? "Parse error",
      fileSizeKB,
      width: 0,
      height: 0,
      elementCount: 0,
      textElementCount: 0,
      elements: [],
      fonts: [],
    };
  }

  const svg = doc.querySelector("svg");
  if (!svg) {
    return {
      valid: false,
      parseError: "No <svg> root element",
      fileSizeKB,
      width: 0,
      height: 0,
      elementCount: 0,
      textElementCount: 0,
      elements: [],
      fonts: [],
    };
  }

  // Dimensions: prefer viewBox, fall back to width/height attributes.
  let width = 0;
  let height = 0;
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !parts.some(Number.isNaN)) {
      width = parts[2];
      height = parts[3];
    }
  }
  if (!width) width = parseFloat(svg.getAttribute("width") ?? "0") || 800;
  if (!height) height = parseFloat(svg.getAttribute("height") ?? "0") || 800;

  // Collect named elements that are candidates for editing.
  const elements: SvgElementInfo[] = [];
  let textCount = 0;
  doc.querySelectorAll("[id]").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "svg") return;
    if (NON_VISUAL_TAGS.has(tag)) return;
    const id = el.getAttribute("id") ?? "";
    if (!id) return;

    const isText = tag === "text" || tag === "tspan";
    const hasFillAttr = el.hasAttribute("fill");
    const fill = el.getAttribute("fill") ?? "";
    const textContent = isText ? (el.textContent ?? "").trim() : "";

    if (isText) textCount++;
    elements.push({
      id,
      tagName: tag,
      isText,
      hasFillAttr,
      textContent,
      fill,
    });
  });

  // Collect font-family values from every text/tspan element.
  // Illustrator emits font-family in three places, so check all:
  //   1. font-family attribute
  //   2. inline style="font-family: ..."
  //   3. <style> block referencing a class — handled by reading the
  //      computed style of each element via getAttribute and the raw
  //      <style> contents (regex parse for common cases)
  const fontSet = new Set<string>();
  doc.querySelectorAll("text, tspan").forEach((el) => {
    const attr = el.getAttribute("font-family");
    if (attr) parseFontFamily(attr).forEach((f) => fontSet.add(f));
    const style = el.getAttribute("style");
    if (style) {
      const m = style.match(/font-family\s*:\s*([^;]+)/i);
      if (m) parseFontFamily(m[1]).forEach((f) => fontSet.add(f));
    }
  });
  // Also scan inline <style> blocks for font-family declarations —
  // Illustrator commonly groups CSS into a single <style> element.
  doc.querySelectorAll("style").forEach((styleEl) => {
    const css = styleEl.textContent ?? "";
    const re = /font-family\s*:\s*([^;}]+)/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(css)) !== null) {
      parseFontFamily(match[1]).forEach((f) => fontSet.add(f));
    }
  });

  return {
    valid: true,
    fileSizeKB,
    width,
    height,
    elementCount: elements.length,
    textElementCount: textCount,
    elements,
    fonts: Array.from(fontSet).sort(),
  };
}

/**
 * Convert an element id like "title-text" or "wedding_date" into a
 * human-readable default label like "Title text" or "Wedding date".
 */
export function deriveLabel(id: string): string {
  const cleaned = id.replace(/[-_]+/g, " ").trim();
  if (!cleaned) return id;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}
