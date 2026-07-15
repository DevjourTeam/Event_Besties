/**
 * Auto-generate a product listing image — the flat design (or a blank board)
 * shown standing in the room, clipped to the product's cut shape.
 *
 * This replaces making the mockup by hand in Illustrator. It runs entirely in
 * the browser on a <canvas>, and its only output is a PNG data URL that flows
 * into the SAME product-image field the builder already uploads. Nothing about
 * designing, printing, or Shopify creation is touched — this only produces an
 * image.
 *
 *   renderTemplateMockup — one board carrying the uploaded design (image-2 style)
 *   renderCanvasLineup   — every size side by side, blank (image-1 style)
 *
 * The cut shape comes from buildShapePath (the editor's own geometry) via
 * Path2D, so an arch clips as an arch, a circle as a circle, etc. — automatically
 * correct for whatever shape the product is.
 */
import { buildShapePath } from "@/components/editor/canvas/editor/shapes";

/** The clean room. Same asset the canvas editor uses as its backdrop. */
const ROOM_SRC = "/canvas-backdrop.webp";
/** Wall/floor junction in that image, measured — boards stand on this line. */
const ROOM_FLOOR = 0.8756;

const OUT = 1200; // output is a square listing image

type ShapeDef = { type: string; svgPath?: string | null };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** Draw the room to cover the whole output square. */
function drawRoom(ctx: CanvasRenderingContext2D, room: HTMLImageElement) {
  const scale = Math.max(OUT / room.width, OUT / room.height);
  const w = room.width * scale;
  const h = room.height * scale;
  ctx.drawImage(room, (OUT - w) / 2, (OUT - h) / 2, w, h);
  // Where the floor sits in the drawn room, in output px.
  return (OUT - h) / 2 + ROOM_FLOOR * h;
}

/** A soft contact shadow beneath a board standing at (cx, floorY). */
function drawShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  floorY: number,
  boardW: number
) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, floorY, 0, cx, floorY, boardW * 0.6);
  g.addColorStop(0, "rgba(70,60,45,0.30)");
  g.addColorStop(1, "rgba(70,60,45,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, floorY, boardW * 0.6, boardW * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Clip the context to `shape`, scaled into the rect (x, y, w, h). */
function clipToShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeDef,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const d = buildShapePath(shape, w, h) as string;
  const path = new Path2D();
  const m = new DOMMatrix().translateSelf(x, y);
  path.addPath(new Path2D(d), m);
  ctx.clip(path);
  return path;
}

/**
 * TEMPLATE product image: the uploaded flat design, clipped to the board shape,
 * standing in the room. `designUrl` is a data URL or same-origin image.
 */
export async function renderTemplateMockup(
  designUrl: string,
  shape: ShapeDef,
  aspect: number // board width / height
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const [room, design] = await Promise.all([
    loadImage(ROOM_SRC),
    loadImage(designUrl),
  ]);
  const floorY = drawRoom(ctx, room);

  // Board sized to leave headroom above and floor below; centred.
  const boardH = Math.min(OUT * 0.74, floorY - OUT * 0.06);
  const boardW = boardH * aspect;
  const x = (OUT - boardW) / 2;
  const y = floorY - boardH;

  drawShadow(ctx, OUT / 2, floorY, boardW);

  ctx.save();
  clipToShape(ctx, shape, x, y, boardW, boardH);
  // Cover the board area with the design (object-fit: cover).
  const s = Math.max(boardW / design.width, boardH / design.height);
  const dw = design.width * s;
  const dh = design.height * s;
  ctx.drawImage(design, x + (boardW - dw) / 2, y + (boardH - dh) / 2, dw, dh);
  ctx.restore();

  // A hairline edge so the board reads as a physical object on the wall.
  ctx.save();
  clipToShape(ctx, shape, x, y, boardW, boardH);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.stroke(new Path2D(buildShapePath(shape, boardW, boardH) as string));
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.9);
}

export type LineupSize = {
  label: string;
  heightCm: number;
  widthCm: number;
};

/**
 * CANVAS product image: every size side by side, blank, standing in the room —
 * tallest at the back, shortest at the front, each at its true relative height,
 * with its size label. `modelUrl` (optional, transparent PNG) is drawn to the
 * right for scale when provided.
 */
export async function renderCanvasLineup(
  sizes: LineupSize[],
  shape: ShapeDef,
  opts?: { modelUrl?: string | null }
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = OUT;
  canvas.height = OUT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const room = await loadImage(ROOM_SRC);
  const floorY = drawRoom(ctx, room);

  const ordered = [...sizes].sort((a, b) => a.heightCm - b.heightCm);
  const tallest = ordered.reduce((m, s) => Math.max(m, s.heightCm), 1);

  // The tallest board fills most of the wall; the rest scale off it by real cm.
  const maxBoardH = Math.min(OUT * 0.72, floorY - OUT * 0.06);
  const model = opts?.modelUrl ? await loadImage(opts.modelUrl).catch(() => null) : null;

  // Lay the boards across the middle, overlapping front-to-back. Reserve the
  // right ~22% for the model when there is one.
  const rightLimit = model ? OUT * 0.78 : OUT * 0.94;
  const leftLimit = OUT * 0.06;
  const span = rightLimit - leftLimit;
  const step = ordered.length > 1 ? span / (ordered.length + 0.4) : 0;

  ordered.forEach((size, i) => {
    const bh = maxBoardH * (size.heightCm / tallest);
    const bw = bh * (size.widthCm / size.heightCm);
    const cx = leftLimit + step * (i + 0.7);
    const x = cx - bw / 2;
    const y = floorY - bh;

    drawShadow(ctx, cx, floorY, bw);

    ctx.save();
    clipToShape(ctx, shape, x, y, bw, bh);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, bw, bh);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    const edge = new Path2D();
    edge.addPath(
      new Path2D(buildShapePath(shape, bw, bh) as string),
      new DOMMatrix().translateSelf(x, y)
    );
    ctx.stroke(edge);
    ctx.restore();

    // Size label, centred on the board.
    ctx.save();
    ctx.fillStyle = "#1b2333";
    ctx.textAlign = "center";
    const big = Math.max(18, bw * 0.22);
    ctx.font = `700 ${big}px Arial, sans-serif`;
    const ftMatch = size.label.match(/^\s*([0-9]+\s*ft)/i);
    const ft = ftMatch ? ftMatch[1].toUpperCase().replace(/\s+/g, "") : size.label;
    ctx.fillText(ft, cx, y + bh * 0.42);
    const dims = size.label.replace(/^\s*[0-9]+\s*ft\s*/i, "").replace(/[()]/g, "");
    if (dims.trim()) {
      ctx.font = `500 ${Math.max(11, bw * 0.09)}px Arial, sans-serif`;
      ctx.fillStyle = "#4a5163";
      ctx.fillText(dims.trim(), cx, y + bh * 0.42 + big * 0.9);
    }
    ctx.restore();
  });

  if (model) {
    const mh = maxBoardH * 1.02;
    const mw = mh * (model.width / model.height);
    ctx.drawImage(model, OUT - mw - OUT * 0.02, floorY - mh, mw, mh);
  }

  return canvas.toDataURL("image/jpeg", 0.9);
}
