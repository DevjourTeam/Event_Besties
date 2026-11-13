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
 * Each field ALSO has a text area, so a long name stays inside its frame rather
 * than just inside the board. The SVG does not record one, and the authored
 * string's own box is too tight ("Anna" would crush any longer name), so the area
 * is: centred on the authored copy, as wide as the larger of a % of the board
 * (DEFAULT_AREA, or the builder's per-field maxWidthPct) and the authored copy. Never narrower than the design as drawn, so typing the authored
 * text changes nothing. The area fit stops at a minimum size; the board fit
 * after it is still the hard limit.
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
  /**
   * The family composeSvg renders this field in. Used only to measure the
   * AUTHORED copy in the same face the customer sees, so the text area below is
   * sized from real metrics. Optional: without it the artwork's own CSS face is
   * measured, which is the same thing for any template whose font wasn't remapped.
   */
  fontFamily?: string;
  /**
   * Width of this field's text AREA, as a % of the board width. The customer's
   * text shrinks until it fits inside it. Undefined = the default (see
   * DEFAULT_AREA). The area is never narrower than the authored copy, so the
   * design as drawn is never shrunk by this.
   */
  maxWidthPct?: number;
  /** Smallest the area fit may shrink to, as a % of the authored size. */
  minFontPct?: number;
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
  // Text-area defaults. A field's area is centred on where the designer put the
  // copy and is the wider of: DEFAULT_AREA of the board, or the authored copy
  // plus AREA_PAD. Designers lay out their text boxes to at least DEFAULT_AREA.
  const DEFAULT_AREA = 0.65;
  // 0: long text never ends up wider than the designer's own copy, which is the
  // width they already judged fits the frame. (Glow Party: +4% touched the neon.)
  // A hair over 0 only to absorb measuring noise between the two renders.
  const AREA_PAD = 0.01;
  const DEFAULT_MIN_FONT = 0.4; // area fit never goes below this × authored size

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
  const toRoot = (
    el: SVGGraphicsElement,
    within: SVGSVGElement = svg
  ): DOMMatrix | null => {
    const e = el.getScreenCTM();
    const r = within.getScreenCTM();
    if (!e || !r) return null;
    return r.inverse().multiply(e); // element user space -> root user space
  };

  /** The element's bounding box expressed in ROOT user units. */
  const rootBox = (el: SVGGraphicsElement, within: SVGSVGElement = svg) => {
    let bb: DOMRect;
    try {
      bb = el.getBBox() as DOMRect;
    } catch {
      return null;
    }
    if (!bb.width && !bb.height) return null;
    const m = toRoot(el, within);
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

  /* --- leading + authored text area per field, from the pristine SVG ---- */
  const leading: Record<string, number> = {};
  const areas: Record<string, { x: number; w: number }> = {};
  const authoredText: Record<string, string> = {};
  // Same rendered width as the live artwork: glyph hinting varies with scale,
  // so measuring the authored copy at another size gives a slightly different
  // width — enough to nudge untouched text down a few percent.
  const liveW = Math.max(1, Math.round(svg.getBoundingClientRect().width)) || 1000;
  const holder = document.createElement("div");
  holder.setAttribute(
    "style",
    "position:absolute;left:-99999px;top:0;width:" +
      liveW +
      "px;visibility:hidden;pointer-events:none;"
  );
  holder.innerHTML = preparedSvg;
  document.body.appendChild(holder);

  const srcSvg = holder.querySelector("svg") as SVGSVGElement | null;
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

    // The authored copy's box, measured in the face the customer will see.
    // Anything that fails to measure simply gets no area, i.e. the old
    // whole-board behaviour — never a worse one.
    if (!r || !srcSvg) continue;
    try {
      const parts: SVGGraphicsElement[] = r.tspans.length
        ? r.tspans
        : [r.textEl || r.first];
      authoredText[f.nodeId] = parts
        .map((p) => p.textContent || "")
        .filter((s) => s.trim() !== "")
        .join("\n");
      if (f.fontFamily) {
        Array.from(srcSvg.querySelectorAll('[data-tf="' + f.nodeId + '"]')).forEach(
          (n) => {
            (n as unknown as HTMLElement).style.fontFamily = "'" + f.fontFamily + "'";
          }
        );
      }
      let box: RootBox | null = null;
      for (const p of parts) {
        const b = rootBox(p, srcSvg);
        if (b) box = box ? unionBox(box, b) : b;
      }
      if (!box || !box.width) continue;

      const pct =
        typeof f.maxWidthPct === "number" && f.maxWidthPct > 0
          ? Math.min(f.maxWidthPct, 100) / 100
          : DEFAULT_AREA;
      const w = Math.min(bounds.w, Math.max(cw * pct, box.width * (1 + AREA_PAD)));
      // Centred on the authored copy, then slid (not squeezed) onto the board.
      let x = box.x + box.width / 2 - w / 2;
      if (x < bounds.x) x = bounds.x;
      if (x + w > bounds.x + bounds.w) x = bounds.x + bounds.w - w;
      areas[f.nodeId] = { x, w };
    } catch {
      /* unmeasurable: fall back to the whole board */
    }
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
    // The horizontal box this field lives in: its text area, or the board.
    // Copy the customer hasn't changed is the design as drawn — it keeps the
    // original whole-board rule exactly, so this can never alter it.
    const liveText = targets
      .map((t) => t.textContent || "")
      .filter((s) => s.trim() !== "")
      .join("\n");
    const unchanged = authoredText[f.nodeId] === liveText;
    const area =
      (!unchanged && areas[f.nodeId]) || { x: bounds.x, w: bounds.w };

    if (f.align) {
      const anchor =
        f.align === "left" ? "start" : f.align === "right" ? "end" : "middle";
      targets.forEach((n) => n.setAttribute("text-anchor", anchor));

      const anchorX =
        f.align === "left"
          ? area.x
          : f.align === "right"
          ? area.x + area.w
          : area.x + area.w / 2;

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
    // Pass 1: fit the field's text AREA, but not below the minimum size.
    // Pass 2: the board itself — the original rule, still the hard limit, so
    // text held up by the minimum can never run off the print.
    const minPct =
      typeof f.minFontPct === "number" && f.minFontPct > 0
        ? Math.min(f.minFontPct, 100) / 100
        : DEFAULT_MIN_FONT;
    const passes = [
      { w: area.w, floor: Math.max(6, base * minPct) },
      { w: bounds.w, floor: 6 },
    ];
    for (const pass of passes) {
      for (let i = 0; i < 8; i++) {
        const b = fieldBox();
        if (!b || !b.width || !b.height) break;
        const k = Math.min(pass.w / b.width, bounds.h / b.height);
        if (k >= 0.999) break; // fits — and we never grow past the authored size
        const next = Math.max(pass.floor, size * k * 0.99);
        if (next >= size) break; // already at this pass's floor
        size = next;
        apply(size);
      }
    }

    /* --- pull it back inside if it still hangs over an edge -------------- */
    const b = fieldBox();
    if (!b) continue;

    // Horizontally: into its area when it fits there, else onto the board.
    const hx = b.width <= area.w + 0.5 ? area : { x: bounds.x, w: bounds.w };
    let dx = 0;
    let dy = 0;
    if (b.x < hx.x) dx = hx.x - b.x;
    else if (b.x + b.width > hx.x + hx.w) dx = hx.x + hx.w - (b.x + b.width);
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
