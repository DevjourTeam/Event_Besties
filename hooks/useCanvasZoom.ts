// ZOOM_FEATURE — revert with: bash scripts/revert-zoom-feature.sh
//
// Canvas fit-to-viewport + user zoom hook shared by FreeEditor and
// TemplateEditor. Watches a container div via ResizeObserver, owns
// userZoom state (clamped 0.5–2.0), and applies a CSS scale transform
// to a pair of refs the caller provides:
//
//   outerRef  — sized to (canvasW × actualScale, canvasH × actualScale).
//               This is what the parent flex/scroll layout sees.
//   innerRef  — intrinsic (canvasW × canvasH) with transform: scale().
//               Transform-origin is the top-left so the outer box
//               dimensions match the visual bounds exactly.
//
// The Fabric canvas element or SVG container sits inside innerRef at
// its native pixel size. Fabric v5 handles CSS-scaled canvases
// correctly — pointer events are mapped through getBoundingClientRect,
// so hit-testing stays accurate.
//
// This deviates from the original zoom-feature.md spec's
// setViewportTransform approach. Both editors use the same DOM
// structure (wrapper divs with CSS transforms) and share this one
// hook. If you need to revert, the script removes the new files and
// strips the ZOOM_FEATURE_START/END blocks from the editors.

"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { computeScale } from "@/lib/canvas-scale";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const STEP = 0.1;

function clamp(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
}

export type UseCanvasZoomArgs = {
  canvasWidth: number;
  canvasHeight: number;
  containerRef: RefObject<HTMLDivElement | null>;
  outerRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
};

export type UseCanvasZoomResult = {
  zoomPercent: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoomPercent: (pct: number) => void;
  isOverflowing: boolean;
  fitScale: number;
  actualScale: number;
};

export function useCanvasZoom({
  canvasWidth,
  canvasHeight,
  containerRef,
  outerRef,
  innerRef,
}: UseCanvasZoomArgs): UseCanvasZoomResult {
  const [userZoom, setUserZoom] = useState(1.0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [scales, setScales] = useState({ fitScale: 1, actualScale: 1 });

  // Keep the latest viewport in a ref so applier callbacks don't need
  // to be recreated just to read it.
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  // Measure container via ResizeObserver — the container can resize
  // independently of the window when left/right panels open/close.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // Apply whenever dimensions or userZoom change.
  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    if (!viewport.w || !viewport.h || !canvasWidth || !canvasHeight) return;

    const result = computeScale(
      canvasWidth,
      canvasHeight,
      viewport.w,
      viewport.h,
      userZoom
    );

    const scaledW = canvasWidth * result.actualScale;
    const scaledH = canvasHeight * result.actualScale;
    outer.style.width = `${scaledW}px`;
    outer.style.height = `${scaledH}px`;

    inner.style.width = `${canvasWidth}px`;
    inner.style.height = `${canvasHeight}px`;
    inner.style.transformOrigin = "0 0";
    inner.style.transform = `scale(${result.actualScale})`;

    setScales({ fitScale: result.fitScale, actualScale: result.actualScale });
    setIsOverflowing(
      scaledW > viewport.w + 0.5 || scaledH > viewport.h + 0.5
    );
  }, [userZoom, viewport.w, viewport.h, canvasWidth, canvasHeight, outerRef, innerRef]);

  const zoomIn = useCallback(() => {
    setUserZoom((z) => clamp(z + STEP));
  }, []);
  const zoomOut = useCallback(() => {
    setUserZoom((z) => clamp(z - STEP));
  }, []);
  const resetZoom = useCallback(() => {
    setUserZoom(1.0);
  }, []);
  const setZoomPercent = useCallback((pct: number) => {
    setUserZoom(clamp(pct / 100));
  }, []);

  return {
    zoomPercent: Math.round(userZoom * 100),
    zoomIn,
    zoomOut,
    resetZoom,
    setZoomPercent,
    isOverflowing,
    fitScale: scales.fitScale,
    actualScale: scales.actualScale,
  };
}
