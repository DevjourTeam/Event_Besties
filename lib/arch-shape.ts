/**
 * The arch ("sailboard") shape — a rectangle with a semicircular top.
 *
 * Templates are always shown and cut as this shape. The geometry mirrors
 * canvas/editor/shapes.js buildShapePath('arch', w, h) exactly, so a template's
 * arch and the custom canvas editor's arch are the same curve, not two that
 * nearly agree.
 */

/** Arch outline in user units, 0,0 → w,h. r = w/2 (semicircular top). */
export function archPath(w: number, h: number): string {
  const r = w / 2;
  return `M 0 ${h} L 0 ${r} A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h} Z`;
}

/**
 * Clip an SVG to the arch, in place.
 *
 * Reads the artwork's own viewBox so the clip lands in the same user space as
 * the design — no dependency on the rounded canvasWidth/Height stored in config.
 *
 * MUST stay self-contained (no imports, no closure): the print renderer ships it
 * into Puppeteer by source so the screen preview and the print file are clipped
 * by identical code. Same discipline as composeSvg / fitTextFields.
 */
export function applyArchClip(svg: SVGSVGElement, clipId: string): void {
  const NS = "http://www.w3.org/2000/svg";
  const vb = svg.viewBox && svg.viewBox.baseVal;
  const w = vb && vb.width ? vb.width : parseFloat(svg.getAttribute("width") || "0");
  const h = vb && vb.height ? vb.height : parseFloat(svg.getAttribute("height") || "0");
  if (!w || !h) return;

  const r = w / 2;
  const d = `M 0 ${h} L 0 ${r} A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h} Z`;

  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  const prev = svg.querySelector("#" + clipId);
  if (prev) prev.remove();

  const clip = document.createElementNS(NS, "clipPath");
  clip.setAttribute("id", clipId);
  clip.setAttribute("clipPathUnits", "userSpaceOnUse");
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d);
  clip.appendChild(path);
  defs.appendChild(clip);

  svg.setAttribute("clip-path", "url(#" + clipId + ")");
}

/**
 * Pull the two centimetre numbers out of a size label like "5ft (150 x 74cm)".
 * Returns { widthCm, heightCm } mapped by the board's own orientation — the
 * larger number is the longer side — so the label writing "150 x 74" or
 * "74 x 150" both land correctly. Null when the label has no usable pair.
 */
export function parseSizeCm(
  label: string | undefined,
  canvasWidth: number,
  canvasHeight: number
): { widthCm: number; heightCm: number } | null {
  if (!label) return null;
  const nums = (label.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0);
  // Prefer the pair that sits next to "cm"; fall back to the two largest.
  const cmMatch = label.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*cm/i);
  const pair = cmMatch
    ? [Number(cmMatch[1]), Number(cmMatch[2])]
    : nums.sort((a, b) => b - a).slice(0, 2);
  if (pair.length < 2) return null;

  const long = Math.max(pair[0], pair[1]);
  const short = Math.min(pair[0], pair[1]);
  const portrait = canvasHeight >= canvasWidth;
  return portrait
    ? { widthCm: short, heightCm: long }
    : { widthCm: long, heightCm: short };
}
