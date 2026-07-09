"use client";

/**
 * SVG overlay drawn on top of the Fabric.js canvas in canvas mode.
 * Always renders above design content, never part of the export.
 *
 *   - Red dashed rectangle  → bleed line (bleedPx inset)
 *   - Green dashed rectangle → safe zone (bleedPx + safePx inset)
 */
type Props = {
  width: number;
  height: number;
  bleedPx: number;
  safePx: number;
};

export function CanvasOverlay({ width, height, bleedPx, safePx }: Props) {
  const safeInset = bleedPx + safePx;
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <rect
        x={bleedPx}
        y={bleedPx}
        width={width - bleedPx * 2}
        height={height - bleedPx * 2}
        fill="none"
        stroke="#d8534f"
        strokeWidth="1.4"
        strokeDasharray="5 4"
      />
      <rect
        x={safeInset}
        y={safeInset}
        width={width - safeInset * 2}
        height={height - safeInset * 2}
        fill="none"
        stroke="#3aa05c"
        strokeWidth="1.4"
        strokeDasharray="5 4"
      />
    </svg>
  );
}
