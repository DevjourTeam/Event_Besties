/**
 * Shrink customer text so it never runs off the artwork.
 *
 * Illustrator sized the type for the copy that shipped; the customer can type
 * anything. Without this, a long name simply spills past the edge of the design
 * and off the print.
 *
 * The text is fitted to the CANVAS, inset by a small margin — it shrinks only
 * once it would actually leave the artboard. Pressing Enter adds a line, which
 * makes the block taller, which re-fits it: the same rule covers both.
 *
 * Why not fit each field to "its own area" instead? Because the SVG does not
 * record one. The only box we could measure is the bounding box of the AUTHORED
 * string, and that is a box around the words the designer happened to type — a
 * template reading "Anna" gives a ~94px box, so any longer name would be crushed
 * to ~5px. Fitting to a real per-field text area needs the admin to define one in
 * the builder; until then the canvas is the honest bound.
 *
 * Text is only ever shrunk, never grown past the authored size, so typing less
 * still looks like the designer's layout.
 *
 * COORDINATE SPACES — the thing that makes this subtle.
 * Illustrator writes `<text transform="translate(cx,cy)">` and puts the tspans at
 * local 0,0. getBBox() reports the box in that LOCAL space, BEFORE the element's
 * own transform. The artboard bounds are in the root's user space. Comparing the
 * two directly says every such text hangs off the top-left corner and "rescues"
 * it by shoving it down and right, over the artwork. So: measure through the
 * element→root matrix, decide in root space, then convert the correction back
 * into the element's own units before writing it onto a tspan.
 *
 * IMPORTANT — must stay SELF-CONTAINED (no imports, no closure references). It is
 * stringified and rebuilt inside Puppeteer so the print renderer applies exactly
 * the same fit as the screen; if the two diverged, the customer would be shown one
 * thing and sent another. Same reason composeSvg is shipped to the page as source.
 *
 * Call only once the fonts have actually LOADED — not merely once fonts.ready has
 * resolved. A webfont is fetched lazily, so ready can settle before the face has
 * been requested at all, and metrics taken in a fallback are the wrong widths.
 */
export type TextAlign = "left" | "center" | "right";

/**
 * `align` is the customer's choice. Undefined means "as the designer drew it" —
 * we then touch neither text-anchor nor x, so every existing template keeps its
 * authored layout (including deliberate per-line indents like "   Soon").
 */
export type FitField = {
  nodeId: string;
  fontSize: number;
  align?: TextAlign;
};

export function fitTextFields(
  rootSelector: string,
  preparedSvg: string,
  fields: FitField[]
): void {
  // Every constant lives INSIDE the function: a module-level const would be
  // undefined once this is stringified into Puppeteer, and the print renderer
  // would throw. See the self-contained note above.
  const MARGIN = 0.02; // keep type this far off the edge, as a fraction

  const root = document.querySelector(rootSelector);
  const svg = root ? (root.querySelector("svg") as SVGSVGElement | null) : null;
  if (!svg) return;

  /* --- the artboard, in root user units --------------------------------- */
  const vb = svg.viewBox?.baseVal;
  const cw = vb && vb.width ? vb.width : parseFloat(svg.getAttribute("width") || "0");
  const ch = vb && vb.height ? vb.height : parseFloat(svg.getAttribute("height") || "0");
  if (!cw || !ch) return;

  const inset = Math.min(cw, ch) * MARGIN;
  const bounds = {
    x: (vb ? vb.x : 0) + inset,
    y: (vb ? vb.y : 0) + inset,
    w: cw - inset * 2,
    h: ch - inset * 2,
  };

  /* --- element space <-> root space -------------------------------------- */
  const toRoot = (el: SVGGraphicsElement): DOMMatrix | null => {
    const e = el.getScreenCTM();
    const r = svg.getScreenCTM();
    if (!e || !r) return null;
    return r.inverse().multiply(e); // element user space -> root user space
  };

  /** The element's bounding box expressed in ROOT user units. */
  const rootBox = (el: SVGGraphicsElement) => {
    let bb: DOMRect;
    try {
      bb = el.getBBox() as DOMRect;
    } catch {
      return null;
    }
    if (!bb.width && !bb.height) return null;
    const m = toRoot(el);
    if (!m) return null;

    const corners = [
      new DOMPoint(bb.x, bb.y),
      new DOMPoint(bb.x + bb.width, bb.y),
      new DOMPoint(bb.x, bb.y + bb.height),
      new DOMPoint(bb.x + bb.width, bb.y + bb.height),
    ].map((p) => p.matrixTransform(m));

    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    const minX = Math.min.apply(null, xs);
    const maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys);
    const maxY = Math.max.apply(null, ys);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  /** A nudge decided in root units, restated in the element's own units. */
  const toLocalDelta = (el: SVGGraphicsElement, dx: number, dy: number) => {
    const m = toRoot(el);
    if (!m) return { dx: 0, dy: 0 };
    const inv = m.inverse();
    // A delta is a vector, so strip the translation by differencing two points.
    const a = new DOMPoint(0, 0).matrixTransform(inv);
    const b = new DOMPoint(dx, dy).matrixTransform(inv);
    return { dx: b.x - a.x, dy: b.y - a.y };
  };

  /* --- the artwork's own line spacing, per field ------------------------ */
  // Read from the pristine SVG: composing may have added or dropped lines, so
  // the authored leading is only recoverable from the original.
  const leading: Record<string, number> = {};
  const holder = document.createElement("div");
  holder.setAttribute(
    "style",
    "position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;"
  );
  holder.innerHTML = preparedSvg;
  document.body.appendChild(holder);

  const srcSvg = holder.querySelector("svg");
  for (const f of fields) {
    const base = f.fontSize || 16;
    let step = base * 1.2;
    const el = srcSvg
      ? (srcSvg.querySelector('[data-tf="' + f.nodeId + '"]') as Element | null)
      : null;
    if (el) {
      const ts = el.querySelectorAll("tspan");
      if (ts.length > 1) {
        const y0 = parseFloat(ts[0].getAttribute("y") || "0");
        const y1 = parseFloat(ts[1].getAttribute("y") || "0");
        if (y1 > y0) step = y1 - y0;
      }
    }
    leading[f.nodeId] = step / base; // as a multiple of the font size
  }
  holder.remove();

  /* --- shrink each field until it sits inside the artboard --------------- */
  for (const f of fields) {
    const el = svg.querySelector(
      '[data-tf="' + f.nodeId + '"]'
    ) as SVGGraphicsElement | null;
    if (!el) continue;

    const tspans = Array.from(el.querySelectorAll("tspan"));
    const base = f.fontSize || 16;
    const ratio = leading[f.nodeId] || 1.2;
    const yFirst = tspans.length
      ? parseFloat(tspans[0].getAttribute("y") || "0")
      : parseFloat(el.getAttribute("y") || "0");

    /* --- alignment, if the customer asked for one ------------------------ */
    // SVG's own text-anchor does the aligning; our job is only to give every
    // line ONE shared anchor point. That single change covers both meanings of
    // "align": the block moves to the chosen edge of the artboard, and the lines
    // line up with each other, because they now share an x.
    //
    // The anchor is chosen in canvas space and converted back into the element's
    // own units — Illustrator positions <text> with a transform, so an x written
    // here is NOT a canvas x. Each line keeps its own y; only x moves.
    if (f.align) {
      el.setAttribute(
        "text-anchor",
        f.align === "left" ? "start" : f.align === "right" ? "end" : "middle"
      );

      const anchorX =
        f.align === "left"
          ? bounds.x
          : f.align === "right"
          ? bounds.x + bounds.w
          : bounds.x + bounds.w / 2;

      const m = toRoot(el);
      if (m) {
        const inv = m.inverse();
        const place = (node: Element) => {
          const lx = parseFloat(node.getAttribute("x") || "0");
          const ly = parseFloat(node.getAttribute("y") || "0");
          const here = new DOMPoint(lx, ly).matrixTransform(m);
          const back = new DOMPoint(anchorX, here.y).matrixTransform(inv);
          node.setAttribute("x", String(back.x));
        };
        if (tspans.length) tspans.forEach(place);
        else place(el);
      }
    }

    // Only y is rewritten here. Per-line x is left alone: unaligned, it is the
    // designer's (Illustrator indents "   Soon" to sit right of "Hatching");
    // aligned, it is the anchor we just set above.
    const apply = (size: number) => {
      (el as unknown as HTMLElement).style.fontSize = size + "px";
      const step = size * ratio;
      tspans.forEach((t, i) => t.setAttribute("y", String(yFirst + step * i)));
    };

    let size = base;
    apply(size);

    // Text metrics are not perfectly linear in the font size, so converge rather
    // than solve. A few passes is plenty and costs nothing.
    for (let i = 0; i < 8; i++) {
      const b = rootBox(el);
      if (!b || !b.width || !b.height) break;

      // How far it pokes out of the artboard, on the worst axis.
      const k = Math.min(bounds.w / b.width, bounds.h / b.height);
      if (k >= 0.999) break; // fits — and we never grow past the authored size
      size = Math.max(6, size * k * 0.99);
      apply(size);
    }

    /* --- pull it back inside if it still hangs over an edge -------------- */
    // Shrinking fixes the SIZE, but a long line centred near the edge can still
    // straddle it; nudge the block back in without moving it otherwise.
    const b = rootBox(el);
    if (!b) continue;

    let dx = 0;
    let dy = 0;
    if (b.x < bounds.x) dx = bounds.x - b.x;
    else if (b.x + b.width > bounds.x + bounds.w)
      dx = bounds.x + bounds.w - (b.x + b.width);
    if (b.y < bounds.y) dy = bounds.y - b.y;
    else if (b.y + b.height > bounds.y + bounds.h)
      dy = bounds.y + bounds.h - (b.y + b.height);

    if (!dx && !dy) continue;

    const d = toLocalDelta(el, dx, dy);
    if (tspans.length) {
      tspans.forEach((t) => {
        t.setAttribute("x", String(parseFloat(t.getAttribute("x") || "0") + d.dx));
        t.setAttribute("y", String(parseFloat(t.getAttribute("y") || "0") + d.dy));
      });
    } else {
      el.setAttribute("x", String(parseFloat(el.getAttribute("x") || "0") + d.dx));
      el.setAttribute("y", String(parseFloat(el.getAttribute("y") || "0") + d.dy));
    }
  }
}
