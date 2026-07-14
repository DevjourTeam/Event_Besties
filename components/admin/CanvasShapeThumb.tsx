"use client";

import type { CanvasConfig } from "@/lib/types";
import { buildShapePath } from "@/components/editor/canvas/editor/shapes";

/**
 * The product's actual cut shape, drawn from the same path builder the editor
 * uses — so an arched sailboard looks like an arch on the dashboard, not like a
 * blank rectangle.
 *
 * A canvas product has no artwork file to show (unlike a template, which has its
 * SVG on Cloudinary), so the silhouette IS the preview.
 */
export function CanvasShapeThumb({
  config,
  maxW,
  maxH,
  showSize = true,
}: {
  config: CanvasConfig;
  maxW: number;
  maxH: number;
  showSize?: boolean;
}) {
  // Fit the print aspect into the box. Use the real print dimensions, not the
  // editor's display pixels — a 105x210cm board must read as tall and narrow.
  const pw = config.printWidthCm || config.displayW || 1;
  const ph = config.printHeightCm || config.displayH || 1;
  const ratio = pw / ph;

  let w = maxW;
  let h = maxW / ratio;
  if (h > maxH) {
    h = maxH;
    w = maxH * ratio;
  }
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));

  const shape = {
    type: config.shape || "rect",
    svgPath: config.shape === "custom" ? config.shapePath ?? null : null,
  };

  let d = "";
  try {
    d = buildShapePath(shape, w, h) as string;
  } catch {
    d = `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden
        className="drop-shadow-sm"
      >
        <path d={d} fill="#ffffff" stroke="#d8d5cd" strokeWidth="1" />
      </svg>
      {showSize && (
        <div className="text-[10px] tracking-[0.06em] text-text-muted uppercase">
          {config.printWidthCm} × {config.printHeightCm} cm
        </div>
      )}
    </div>
  );
}
