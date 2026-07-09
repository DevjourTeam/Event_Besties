"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { fabric as FabricNS } from "fabric";
import { EditorShell } from "./EditorShell";
import { handoffDesign } from "@/lib/cart-client";
import { CanvasOverlay } from "./CanvasOverlay";
import { UploadToolPanel } from "./UploadToolPanel";
import { TextToolPanel, cssFamilyFor, type TextStyle } from "./TextToolPanel";
import { PropertiesPanel, type ActiveProps } from "./PropertiesPanel";
import { UndoRedoBar } from "./UndoRedoBar";
import { useToast } from "@/components/Toast";
import { FabricHistory } from "@/lib/fabric-history";
import { googleFontsHref } from "@/lib/google-fonts";
import type { CanvasConfig } from "@/lib/types";
// ZOOM_FEATURE_START
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { ZoomControls } from "./ZoomControls";
// ZOOM_FEATURE_END

type FabricLib = typeof FabricNS;
type FabricCanvas = FabricNS.Canvas;
type FabricObject = FabricNS.Object;

const SELECTION_STYLES = {
  cornerColor: "#c8a96e",
  borderColor: "#c8a96e",
  cornerStyle: "circle" as const,
  cornerSize: 9,
  transparentCorners: false,
  editingBorderColor: "#c8a96e",
};

/**
 * Mode 2 — Free canvas editor backed by Fabric.js v5.
 *
 * Tools on the left: upload + text. Properties panel on the right when an
 * object is selected. Bleed/safe overlay sits above the canvas and is never
 * exported. Undo/redo via FabricHistory, also bound to keyboard shortcuts.
 */
export function FreeEditor({ config }: { config: CanvasConfig }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId") ?? "";

  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricLib | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const historyRef = useRef<FabricHistory | null>(null);
  // ZOOM_FEATURE_START
  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const zoomOuterRef = useRef<HTMLDivElement | null>(null);
  const zoomInnerRef = useRef<HTMLDivElement | null>(null);
  const zoom = useCanvasZoom({
    canvasWidth: config.displayW,
    canvasHeight: config.displayH,
    containerRef: zoomContainerRef,
    outerRef: zoomOuterRef,
    innerRef: zoomInnerRef,
  });
  // ZOOM_FEATURE_END

  const [ready, setReady] = useState(false);
  const [textPanelOpen, setTextPanelOpen] = useState(false);
  const [active, setActive] = useState<ActiveProps | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Inject Google Fonts <link> once at mount.
  useEffect(() => {
    const id = "eb-google-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = googleFontsHref();
    document.head.appendChild(link);
  }, []);

  // ---- Capture active object props into React state ----
  const captureActive = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const obj = c.getActiveObject();
    if (!obj) {
      setActive(null);
      return;
    }
    const isText = obj.type === "i-text" || obj.type === "text" || obj.type === "textbox";
    const w = (obj.width ?? 0) * (obj.scaleX ?? 1);
    const h = (obj.height ?? 0) * (obj.scaleY ?? 1);
    setActive({
      type: obj.type ?? "",
      isText,
      width: Math.round(w),
      height: Math.round(h),
      angle: Math.round(obj.angle ?? 0),
      opacity: obj.opacity ?? 1,
      fontSize: isText ? (obj as FabricNS.IText).fontSize ?? 16 : undefined,
      fontWeight: isText ? String((obj as FabricNS.IText).fontWeight ?? "normal") : undefined,
      fontStyle: isText ? String((obj as FabricNS.IText).fontStyle ?? "normal") : undefined,
    });
  }, []);

  const refreshHistoryFlags = useCallback(() => {
    const h = historyRef.current;
    if (!h) return;
    setCanUndo(h.canUndo());
    setCanRedo(h.canRedo());
  }, []);

  const pushHistory = useCallback(() => {
    historyRef.current?.push();
    refreshHistoryFlags();
  }, [refreshHistoryFlags]);

  // ---- Init Fabric ----
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const mod = await import("fabric");
      if (cancelled || !canvasElRef.current) return;
      const F = mod.fabric;
      fabricRef.current = F;

      const canvas = new F.Canvas(canvasElRef.current, {
        width: config.displayW,
        height: config.displayH,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      });
      canvasRef.current = canvas;

      const history = new FabricHistory(canvas);
      historyRef.current = history;
      // Initial empty snapshot.
      history.push();

      const onSelectionChanged = () => captureActive();
      const onSelectionCleared = () => setActive(null);
      const onModified = () => {
        captureActive();
        pushHistory();
      };
      const onTextChanged = () => {
        captureActive();
        pushHistory();
      };

      canvas.on("selection:created", onSelectionChanged);
      canvas.on("selection:updated", onSelectionChanged);
      canvas.on("selection:cleared", onSelectionCleared);
      canvas.on("object:modified", onModified);
      canvas.on("text:changed", onTextChanged);

      setReady(true);
      refreshHistoryFlags();

      cleanup = () => {
        canvas.off("selection:created", onSelectionChanged);
        canvas.off("selection:updated", onSelectionChanged);
        canvas.off("selection:cleared", onSelectionCleared);
        canvas.off("object:modified", onModified);
        canvas.off("text:changed", onTextChanged);
        canvas.dispose();
        canvasRef.current = null;
        historyRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // We intentionally only init once per mount. Dimension changes would
    // require a full canvas rebuild, which is outside Phase 7 scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const c = canvasRef.current;
      if (!c) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        historyRef.current?.undo(() => {
          captureActive();
          refreshHistoryFlags();
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        historyRef.current?.redo(() => {
          captureActive();
          refreshHistoryFlags();
        });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const obj = c.getActiveObject();
        if (obj && obj.selectable !== false) {
          c.remove(obj);
          c.discardActiveObject();
          c.renderAll();
          setActive(null);
          pushHistory();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateActive();
        return;
      }
      if (e.key === "Escape") {
        c.discardActiveObject();
        c.renderAll();
        setActive(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureActive, pushHistory, refreshHistoryFlags]);

  // ---- Tool actions ----
  const handleUploadImage = (dataUrl: string) => {
    const F = fabricRef.current;
    const c = canvasRef.current;
    if (!F || !c) return;
    F.Image.fromURL(
      dataUrl,
      (img) => {
        const maxW = c.getWidth() * 0.76;
        const maxH = c.getHeight() * 0.76;
        const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1), 1);
        img.set({
          left: c.getWidth() / 2,
          top: c.getHeight() / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          ...SELECTION_STYLES,
        });
        // Tag user uploads so toJSON keeps the marker.
        (img as FabricObject & { _isUserImage?: boolean })._isUserImage = true;
        c.add(img);
        c.setActiveObject(img);
        c.renderAll();
        captureActive();
        pushHistory();
      },
      { crossOrigin: "anonymous" }
    );
  };

  const handleAddText = (
    style: TextStyle,
    opts: { fontFamily: string; fontSize: number; fill: string; fontWeight: string }
  ) => {
    const F = fabricRef.current;
    const c = canvasRef.current;
    if (!F || !c) return;
    const sample = style === "heading" ? "Your Heading" : style === "subheading" ? "Subheading" : "Your text here";
    const text = new F.IText(sample, {
      left: c.getWidth() / 2,
      top: c.getHeight() / 2,
      originX: "center",
      originY: "center",
      fontSize: opts.fontSize,
      fontWeight: opts.fontWeight,
      fontFamily: opts.fontFamily,
      fill: opts.fill,
      ...SELECTION_STYLES,
    });
    c.add(text);
    c.setActiveObject(text);
    c.renderAll();
    captureActive();
    pushHistory();
  };

  const applyToActiveText = (patch: Partial<{
    fontFamily: string;
    fontSize: number;
    fill: string;
    fontWeight: string;
    fontStyle: string;
  }>) => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject() as FabricNS.IText | undefined;
    if (!c || !obj) return;
    if (!(obj.type === "i-text" || obj.type === "text" || obj.type === "textbox")) return;
    // Fabric's IText typings are strict about font enums — cast through unknown.
    obj.set(patch as unknown as Partial<FabricNS.IText>);
    c.renderAll();
    captureActive();
    pushHistory();
  };

  // ---- Properties handlers ----
  const setW = (w: number) => mutate((obj) => obj.set("scaleX", Math.max(0.01, w / (obj.width ?? 1))));
  const setH = (h: number) => mutate((obj) => obj.set("scaleY", Math.max(0.01, h / (obj.height ?? 1))));
  const setAngle = (a: number) => mutate((obj) => obj.set("angle", a));
  const setOpacity = (o: number) => mutate((obj) => obj.set("opacity", Math.max(0, Math.min(1, o))));
  const setFontSize = (n: number) => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject() as FabricNS.IText | undefined;
    if (!c || !obj) return;
    obj.set("fontSize", Math.max(8, Math.min(400, n)));
    c.renderAll();
    captureActive();
    pushHistory();
  };
  const toggleBold = () => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject() as FabricNS.IText | undefined;
    if (!c || !obj) return;
    const next = String(obj.fontWeight) === "bold" ? "normal" : "bold";
    obj.set("fontWeight", next);
    c.renderAll();
    captureActive();
    pushHistory();
  };
  const toggleItalic = () => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject() as FabricNS.IText | undefined;
    if (!c || !obj) return;
    const next = String(obj.fontStyle) === "italic" ? "normal" : "italic";
    obj.set("fontStyle", next);
    c.renderAll();
    captureActive();
    pushHistory();
  };
  const bringForward = () => mutateNoSetCoords((obj, c) => c.bringForward(obj));
  const sendBackward = () => mutateNoSetCoords((obj, c) => c.sendBackwards(obj));
  const duplicateActive = () => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    obj.clone((clone: FabricObject) => {
      clone.set({
        left: (obj.left ?? 0) + 16,
        top: (obj.top ?? 0) + 16,
        ...SELECTION_STYLES,
      });
      const tagged = obj as FabricObject & { _isUserImage?: boolean };
      if (tagged._isUserImage) {
        (clone as FabricObject & { _isUserImage?: boolean })._isUserImage = true;
      }
      c.add(clone);
      c.setActiveObject(clone);
      c.renderAll();
      captureActive();
      pushHistory();
    });
  };
  const removeActive = () => {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    c.remove(obj);
    c.discardActiveObject();
    c.renderAll();
    setActive(null);
    pushHistory();
  };

  function mutate(fn: (obj: FabricObject) => void) {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    fn(obj);
    obj.setCoords();
    c.renderAll();
    captureActive();
    pushHistory();
  }
  function mutateNoSetCoords(fn: (obj: FabricObject, c: FabricCanvas) => void) {
    const c = canvasRef.current;
    const obj = c?.getActiveObject();
    if (!c || !obj) return;
    fn(obj, c);
    c.renderAll();
    captureActive();
    pushHistory();
  }

  // ---- Process ----
  const handleProcess = async () => {
    const c = canvasRef.current;
    if (!c) {
      toast.show("Canvas not ready");
      return;
    }
    setProcessing(true);
    try {
      const fabricJSON = c.toJSON(["_isUserImage"]);
      const res = await fetch("/api/editor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "canvas",
          templateId: config.templateId,
          fabricJSON,
          displayW: config.displayW,
          displayH: config.displayH,
          printWidthCm: config.printWidthCm,
          printHeightCm: config.printHeightCm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Export failed");

      if (!variantId) {
        toast.show("Print file ready (open via Shopify product page to add to cart)");
        return;
      }
      await handoffDesign({
        variantId,
        printUrl: data.printUrl,
        previewUrl: data.previewUrl,
        templateId: config.templateId,
        designType: "canvas",
      });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Process failed");
    } finally {
      setProcessing(false);
    }
  };

  // ---- Render ----
  const leftPanel = (
    <div className="p-5 space-y-3">
      <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted">Tools</div>
      <UploadToolPanel onFile={handleUploadImage} />
      <TextToolPanel
        open={textPanelOpen}
        onToggle={() => setTextPanelOpen((v) => !v)}
        onAddText={handleAddText}
        onApplyToActive={applyToActiveText}
      />
      {!ready && (
        <div className="text-[11px] text-text-muted">Loading canvas…</div>
      )}
    </div>
  );

  const rightPanel = active && (
    <PropertiesPanel
      active={active}
      handlers={{
        setWidth: setW,
        setHeight: setH,
        setAngle,
        setOpacity,
        setFontSize,
        toggleBold,
        toggleItalic,
        bringForward,
        sendBackward,
        duplicate: duplicateActive,
        remove: removeActive,
      }}
    />
  );

  const canvasArea = (
    // ZOOM_FEATURE_START
    <div
      ref={zoomContainerRef}
      className={`w-full h-full flex ${
        zoom.isOverflowing ? "overflow-auto" : "overflow-hidden"
      }`}
      style={{ alignItems: "safe center", justifyContent: "safe center" }}
    >
      <div ref={zoomOuterRef} className="relative shrink-0">
        <div
          ref={zoomInnerRef}
          className="relative shadow-md"
          style={{ width: config.displayW, height: config.displayH }}
        >
          <canvas
            ref={canvasElRef}
            width={config.displayW}
            height={config.displayH}
          />
          <CanvasOverlay
            width={config.displayW}
            height={config.displayH}
            bleedPx={config.bleedPx}
            safePx={config.safePx}
          />
        </div>
      </div>
    </div>
    // ZOOM_FEATURE_END
  );

  // Suppress unused warning — cssFamilyFor is exported for future external use.
  void cssFamilyFor;

  return (
    <EditorShell
      config={config}
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      rightPanelVisible={!!active}
      canvasArea={canvasArea}
      topRightActions={
        <div className="flex items-center gap-2">
          {/* ZOOM_FEATURE_START */}
          <ZoomControls
            zoomPercent={zoom.zoomPercent}
            onZoomIn={zoom.zoomIn}
            onZoomOut={zoom.zoomOut}
            onReset={zoom.resetZoom}
            onSetZoom={zoom.setZoomPercent}
          />
          <span className="w-px h-5 bg-card-border" />
          {/* ZOOM_FEATURE_END */}
          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() =>
              historyRef.current?.undo(() => {
                captureActive();
                refreshHistoryFlags();
              })
            }
            onRedo={() =>
              historyRef.current?.redo(() => {
                captureActive();
                refreshHistoryFlags();
              })
            }
          />
        </div>
      }
      onProcess={handleProcess}
      processing={processing}
    />
  );
}
