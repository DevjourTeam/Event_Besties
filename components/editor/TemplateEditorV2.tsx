"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EditorShell } from "./EditorShell";
import { useToast } from "@/components/Toast";
import { handoffDesign } from "@/lib/cart-client";
import { googleFontsHrefFor } from "@/lib/google-fonts";
import { composeSvg } from "@/lib/svg-template";
import type { TemplateConfig, WithProductImage } from "@/lib/types";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { ZoomControls } from "./ZoomControls";

type V2Config = WithProductImage<
  TemplateConfig & { version: 2; sourceSvgUrl: string }
>;

/**
 * Customer editor — template v2.
 *
 * Renders by composing: prepared SVG + the values the customer typed. The design
 * is never mutated in place, so there is no notion of an element being "unlocked"
 * — anything the config didn't declare as a field simply has no control, and the
 * customer has no way to reach it.
 *
 * At print time we send VALUES, not artwork. The server re-reads the pristine
 * template from Shopify and composes it itself (see /api/editor/export), which
 * means poking the DOM in devtools can change what this screen looks like but
 * cannot change what gets printed.
 */
export function TemplateEditorV2({ config }: { config: V2Config }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId") ?? "";

  const containerRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement | null>(null);
  const zoomOuterRef = useRef<HTMLDivElement | null>(null);
  const zoomInnerRef = useRef<HTMLDivElement | null>(null);
  const zoom = useCanvasZoom({
    canvasWidth: config.canvasWidth,
    canvasHeight: config.canvasHeight,
    containerRef: zoomContainerRef,
    outerRef: zoomOuterRef,
    innerRef: zoomInnerRef,
  });

  const fields = useMemo(() => config.textFields ?? [], [config.textFields]);
  const slots = useMemo(() => config.colorSlots ?? [], [config.colorSlots]);
  const editableFields = useMemo(() => fields.filter((f) => f.editable), [fields]);
  const exposedSlots = useMemo(() => slots.filter((s) => s.exposed), [slots]);

  const [sourceSvg, setSourceSvg] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [textValues, setTextValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.nodeId, f.value]))
  );
  const [colorValues, setColorValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(slots.map((s) => [s.nodeId, s.hex]))
  );

  // The fonts the admin mapped. Without these the design renders in a fallback
  // face and looks broken — the builder guarantees every one is a real Google
  // family, so this always resolves.
  useEffect(() => {
    const href = googleFontsHrefFor(config.requiredFonts ?? []);
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [config.requiredFonts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(config.sourceSvgUrl);
        if (!res.ok) throw new Error(`Template failed to load (${res.status})`);
        const text = await res.text();
        if (!cancelled) setSourceSvg(text);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Template failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.sourceSvgUrl]);

  // Recompose on every keystroke. Same function the print renderer runs.
  useEffect(() => {
    if (!sourceSvg || !containerRef.current) return;
    try {
      containerRef.current.innerHTML = composeSvg(sourceSvg, {
        textFields: fields.map((f) => ({
          nodeId: f.nodeId,
          fontFamily: f.fontFamily,
          fontSize: f.fontSize,
          fill: f.fill,
        })),
        textValues,
        colorValues,
      });
      const svg = containerRef.current.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", String(config.canvasWidth));
        svg.setAttribute("height", String(config.canvasHeight));
      }
    } catch {
      setLoadError("Could not render this template");
    }
  }, [sourceSvg, fields, textValues, colorValues, config.canvasWidth, config.canvasHeight]);

  const handleProcess = async () => {
    if (!config.productId) {
      toast.show("Missing product reference — open this from the product page");
      return;
    }
    setProcessing(true);
    try {
      // Values only. The server rebuilds the artwork from its own copy of the
      // template, so there is nothing here worth tampering with.
      const res = await fetch("/api/editor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "template",
          version: 2,
          templateId: config.templateId,
          productId: config.productId,
          textValues,
          colorValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Export failed");

      if (!variantId) {
        toast.show("Print file ready (open via the Shopify product page to add to cart)");
        return;
      }

      const summary = editableFields
        .map((f) => `${f.label}: ${textValues[f.nodeId] ?? ""}`)
        .join(" · ");

      await handoffDesign({
        variantId,
        printUrl: data.printUrl,
        previewUrl: data.previewUrl,
        templateId: config.templateId,
        designType: "template",
        customizationSummary: summary || undefined,
      });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Process failed");
    } finally {
      setProcessing(false);
    }
  };

  const leftPanel = (
    <div className="p-5 space-y-4">
      <div className="text-[10px] tracking-[0.16em] uppercase text-text-muted">
        Personalise
      </div>

      {!sourceSvg && !loadError && (
        <div className="text-[12px] text-text-muted">Loading template…</div>
      )}

      {loadError && (
        <div className="text-[12px] text-[#a83232] bg-[#fbe9e9] border border-[#f1cccc] rounded-md px-3 py-2">
          {loadError}
        </div>
      )}

      {sourceSvg && editableFields.length === 0 && exposedSlots.length === 0 && (
        <div className="text-[12px] text-text-muted">
          This template has no customer-editable fields.
        </div>
      )}

      {sourceSvg &&
        editableFields.map((f) => (
          <FieldRow key={f.nodeId} label={f.label}>
            <input
              type="text"
              value={textValues[f.nodeId] ?? ""}
              onChange={(e) =>
                setTextValues((v) => ({ ...v, [f.nodeId]: e.target.value }))
              }
              className="w-full h-9 px-3 rounded-md border border-card-border bg-form-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </FieldRow>
        ))}

      {sourceSvg &&
        exposedSlots.map((s) => (
          <FieldRow key={s.nodeId} label={s.label}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorValues[s.nodeId] ?? s.hex}
                onChange={(e) =>
                  setColorValues((v) => ({ ...v, [s.nodeId]: e.target.value }))
                }
                className="w-10 h-9 p-0 border border-card-border rounded-md bg-white cursor-pointer"
              />
              <input
                type="text"
                value={colorValues[s.nodeId] ?? s.hex}
                onChange={(e) =>
                  setColorValues((v) => ({ ...v, [s.nodeId]: e.target.value }))
                }
                className="flex-1 h-9 px-2 rounded-md border border-card-border bg-form-surface text-[12px] font-mono uppercase"
              />
            </div>
          </FieldRow>
        ))}
    </div>
  );

  const canvasArea = (
    <div
      ref={zoomContainerRef}
      className={`w-full h-full flex ${
        zoom.isOverflowing ? "overflow-auto" : "overflow-hidden"
      }`}
      style={{ alignItems: "safe center", justifyContent: "safe center" }}
    >
      {loadError ? (
        <div className="text-[12px] text-text-muted text-center">
          Cannot render preview without a valid template.
        </div>
      ) : (
        <div ref={zoomOuterRef} className="shrink-0">
          <div
            ref={zoomInnerRef}
            className="bg-white border border-card-border rounded-card shadow-md"
          >
            <div ref={containerRef} className="w-full h-full [&>svg]:block" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <EditorShell
      config={config}
      leftPanel={leftPanel}
      canvasArea={canvasArea}
      topRightActions={
        <ZoomControls
          zoomPercent={zoom.zoomPercent}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onReset={zoom.resetZoom}
          onSetZoom={zoom.setZoomPercent}
        />
      }
      onProcess={handleProcess}
      processing={processing}
    />
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[11px] text-text-muted mb-1">{label}</div>
      {children}
    </label>
  );
}
