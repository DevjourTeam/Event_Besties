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

/** A bounding box in the root SVG's user units. */
type RootBox = { x: number; y: number; width: number; height: number };

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

  /** Union of two root-space boxes. */
  const unionBox = (a: RootBox, b: RootBox): RootBox => {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return {
      x,
      y,
      width: Math.max(a.x + a.width, b.x + b.width) - x,
      height: Math.max(a.y + a.height, b.y + b.height) - y,
    };
  };

  /**
   * A field's parts from its data-tf marker. It is marked EITHER on a bare
   * <text> (a whole single-run block) OR on the leaf tspans of one colour run —
   * a block that mixes colours is split into a field per run (see prepareSvg), so
   * each run sizes and moves on its own. `tspans` are the lines; `first` gives the
   * shared CTM; `textEl` is set only for a bare block.
   */
  const resolve =
    (scope: Element) =>
    (nodeId: string) => {
      const nodes = Array.from(
        scope.querySelectorAll('[data-tf="' + nodeId + '"]')
      ) as SVGGraphicsElement[];
      if (!nodes.length) return null;
      const first = nodes[0];
      const isText = first.tagName.toLowerCase() === "text";
      const tspans = (
        isText
          ? Array.from(first.querySelectorAll("tspan")).filter(
              (t) => !t.querySelector("tspan") && (t.textContent || "").trim() !== ""
            )
          : nodes
      ) as SVGGraphicsElement[];
      return { first, tspans, textEl: isText ? first : null };
    };

  /* --- leading per field, read from the pristine SVG -------------------- */
  const leading: Record<string, number> = {};
  const holder = document.createElement("div");
  holder.setAttribute(
    "style",
    "position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;"
  );
  holder.innerHTML = preparedSvg;
  document.body.appendChild(holder);

  const srcSvg = holder.querySelector("svg");
  const srcResolve = srcSvg ? resolve(srcSvg) : null;
  for (const f of fields) {
    const base = f.fontSize || 16;
    let step = base * 1.2;
    const r = srcResolve ? srcResolve(f.nodeId) : null;
    if (r && r.tspans.length > 1) {
      const y0 = parseFloat(r.tspans[0].getAttribute("y") || "0");
      const y1 = parseFloat(r.tspans[1].getAttribute("y") || "0");
      if (y1 > y0) step = y1 - y0;
    }
    leading[f.nodeId] = step / base; // as a multiple of the font size
  }
  holder.remove();

  /* --- shrink each field until it sits inside the artboard --------------- */
  const liveResolve = resolve(svg);
  for (const f of fields) {
    const r = liveResolve(f.nodeId);
    if (!r) continue;
    const { first, tspans, textEl } = r;

    const base = f.fontSize || 16;
    const ratio = leading[f.nodeId] || 1.2;
    const yFirst = tspans.length
      ? parseFloat(tspans[0].getAttribute("y") || "0")
      : parseFloat((textEl || first).getAttribute("y") || "0");

    // Every line the field owns; a bare single-line block is just the element.
    const targets: SVGGraphicsElement[] = tspans.length ? tspans : [textEl || first];

    /** The field's own box in root units — the union of its lines. */
    const fieldBox = (): RootBox | null => {
      if (!tspans.length) return rootBox(textEl || first);
      let box: RootBox | null = null;
      for (const t of tspans) {
        const b = rootBox(t);
        if (b) box = box ? unionBox(box, b) : b;
      }
      return box;
    };

    /* --- alignment, if the customer asked for one ------------------------ */
    // SVG's own text-anchor aligns; we just give every line ONE shared anchor
    // point, chosen in canvas space and converted back into the element's own
    // units (the <text> carries a transform, so a canvas x is not a local x).
    if (f.align) {
      const anchor =
        f.align === "left" ? "start" : f.align === "right" ? "end" : "middle";
      targets.forEach((n) => n.setAttribute("text-anchor", anchor));

      const anchorX =
        f.align === "left"
          ? bounds.x
          : f.align === "right"
          ? bounds.x + bounds.w
          : bounds.x + bounds.w / 2;

      const m = toRoot(first);
      if (m) {
        const inv = m.inverse();
        targets.forEach((node) => {
          const lx = parseFloat(node.getAttribute("x") || "0");
          const ly = parseFloat(node.getAttribute("y") || "0");
          const here = new DOMPoint(lx, ly).matrixTransform(m);
          const back = new DOMPoint(anchorX, here.y).matrixTransform(inv);
          node.setAttribute("x", String(back.x));
        });
      }
    }

    // Size lives on the lines, not the shared <text>, so one run shrinking never
    // drags another run in the same block. Only y is rewritten; x is the
    // designer's (or the anchor set above).
    const apply = (size: number) => {
      if (tspans.length) {
        tspans.forEach((t, i) => {
          (t as unknown as HTMLElement).style.fontSize = size + "px";
          t.setAttribute("y", String(yFirst + size * ratio * i));
        });
      } else {
        ((textEl || first) as unknown as HTMLElement).style.fontSize = size + "px";
      }
    };

    let size = base;
    apply(size);

    // Text metrics are not perfectly linear in the font size, so converge.
    for (let i = 0; i < 8; i++) {
      const b = fieldBox();
      if (!b || !b.width || !b.height) break;
      const k = Math.min(bounds.w / b.width, bounds.h / b.height);
      if (k >= 0.999) break; // fits — and we never grow past the authored size
      size = Math.max(6, size * k * 0.99);
      apply(size);
    }

    /* --- pull it back inside if it still hangs over an edge -------------- */
    const b = fieldBox();
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

    const d = toLocalDelta(first, dx, dy);
    targets.forEach((n) => {
      n.setAttribute("x", String(parseFloat(n.getAttribute("x") || "0") + d.dx));
      n.setAttribute("y", String(parseFloat(n.getAttribute("y") || "0") + d.dy));
    });
  }
}
