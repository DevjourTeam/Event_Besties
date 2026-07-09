// ZOOM_FEATURE — revert with: bash scripts/revert-zoom-feature.sh
//
// Pure math for "fit to viewport + user zoom". Framework agnostic —
// callers hand in the design dimensions and the available viewport
// dimensions, the module returns the scale factors and centering
// offsets. No side effects here; DOM/Fabric mutation lives in
// useCanvasZoom so this stays unit-testable.
//
// Deviation from the original spec: applier is not wired into this
// module. The spec called canvas.setViewportTransform directly here,
// but we drive both the Fabric and SVG editors through CSS transforms
// on wrapper divs (see useCanvasZoom), so canvas-scale stays pure.

export type ScaleResult = {
  /** Scale that fits the full design into the viewport (no user zoom). */
  fitScale: number;
  /** fitScale * userZoom — what the wrapper's CSS transform should use. */
  actualScale: number;
  /** Horizontal centering offset when content is smaller than viewport. */
  offsetX: number;
  /** Vertical centering offset when content is smaller than viewport. */
  offsetY: number;
  /** Rounded integer representation of userZoom for UI display. */
  zoomPercent: number;
};

export function calculateFitScale(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  if (!canvasWidth || !canvasHeight || !viewportWidth || !viewportHeight) {
    return 1;
  }
  return Math.min(viewportWidth / canvasWidth, viewportHeight / canvasHeight);
}

export function computeScale(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  userZoom: number
): ScaleResult {
  const fitScale = calculateFitScale(
    canvasWidth,
    canvasHeight,
    viewportWidth,
    viewportHeight
  );
  const actualScale = fitScale * userZoom;
  const scaledW = canvasWidth * actualScale;
  const scaledH = canvasHeight * actualScale;
  const offsetX = Math.max(0, (viewportWidth - scaledW) / 2);
  const offsetY = Math.max(0, (viewportHeight - scaledH) / 2);
  return {
    fitScale,
    actualScale,
    offsetX,
    offsetY,
    zoomPercent: Math.round(userZoom * 100),
  };
}
