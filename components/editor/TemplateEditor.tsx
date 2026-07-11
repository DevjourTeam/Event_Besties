"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EditorShell } from "./EditorShell";
import { useToast } from "@/components/Toast";
import type { TemplateConfig } from "@/lib/types";
import { handoffDesign } from "@/lib/cart-client";
import { googleFontsHrefFor } from "@/lib/google-fonts";
// ZOOM_FEATURE_START
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { ZoomControls } from "./ZoomControls";
// ZOOM_FEATURE_END

/**
 * Mode 1 — SVG DOM editor.
 *
 * Loads the SVG from config.svgUrl, injects it into a container, then
 * mutates ONLY:
 *   - text fields: element.textContent
 *   - color fields: element.setAttribute('fill', ...)
 *
 * Per PROMPT.md, the editor never touches transform / x / y / font /
 * size / any other attribute. The SVG keeps its original layout pixel-perfect.
 */
export function TemplateEditor({ config }: { config: TemplateConfig }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId") ?? "";
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // ZOOM_FEATURE_START
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
  // ZOOM_FEATURE_END

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Inject a single Google Fonts <link> tag covering every font detected
  // in the SVG at upload time. Without this, browsers fall back to
  // their default font for editable text and the design looks broken.
  useEffect(() => {
    const fonts = config.requiredFonts ?? [];
    const href = googleFontsHrefFor(fonts);
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.eventBestiesFonts = "1";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [config.requiredFonts]);

  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [colorValues, setColorValues] = useState<Record<string, string>>({});

  const unlockedFields = useMemo(
    () =>
      Object.entries(config.permissions)
        .filter(([, p]) => !p.locked && p.type !== "locked")
        .map(([id, p]) => ({ id, label: p.label, type: p.type })),
    [config.permissions]
  );

  // Load and inject SVG once.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(null);

    async function load() {
      if (!config.svgUrl) {
        setLoadError("No SVG URL is set on this template configuration.");
        return;
      }
      try {
        const res = await fetch(config.svgUrl, { cache: "force-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status} loading SVG`);
        const text = await res.text();
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = text;
        const svg = containerRef.current.querySelector("svg") as SVGSVGElement | null;
        if (!svg) {
          setLoadError("Loaded file does not contain an <svg> element.");
          return;
        }
        svg.style.pointerEvents = "none";
        // ZOOM_FEATURE_START
        svg.style.display = "block";
        svg.style.width = "100%";
        svg.style.height = "100%";
        // ZOOM_FEATURE_END
        svgRef.current = svg;

        // Read initial values for each unlocked field.
        const initText: Record<string, string> = {};
        const initColor: Record<string, string> = {};
        for (const field of unlockedFields) {
          const el = svg.querySelector(`#${CSS.escape(field.id)}`);
          if (!el) continue;
          if (field.type === "text") {
            initText[field.id] = el.textContent ?? "";
          } else if (field.type === "color") {
            const fill = el.getAttribute("fill") ?? "#000000";
            initColor[field.id] = normalizeColor(fill);
          }
        }
        setTextValues(initText);
        setColorValues(initColor);
        setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load SVG");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [config.svgUrl, unlockedFields]);

  const updateText = useCallback((id: string, value: string) => {
    setTextValues((prev) => ({ ...prev, [id]: value }));
    const svg = svgRef.current;
    if (!svg) return;
    const el = svg.querySelector(`#${CSS.escape(id)}`);
    if (!el) return;
    // Only textContent — never font, size, position, transform.
    el.textContent = value;
  }, []);

  const updateColor = useCallback((id: string, value: string) => {
    const normalized = normalizeColor(value);
    setColorValues((prev) => ({ ...prev, [id]: normalized }));
    const svg = svgRef.current;
    if (!svg) return;
    const el = svg.querySelector(`#${CSS.escape(id)}`);
    if (!el) return;
    // Only fill — never position, size, shape, anything else.
    el.setAttribute("fill", normalized);
  }, []);

  const handleProcess = async () => {
    const svg = svgRef.current;
    if (!svg) {
      toast.show("SVG not loaded yet");
      return;
    }
    setProcessing(true);
    try {
      const svgString = new XMLSerializer().serializeToString(svg);
      const res = await fetch("/api/editor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "template",
          templateId: config.templateId,
          svgString,
          canvasWidth: config.canvasWidth,
          canvasHeight: config.canvasHeight,
          fonts: config.requiredFonts ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Export failed");

      if (!variantId) {
        toast.show("Print file ready (open via Shopify product page to add to cart)");
        return;
      }

      const summary = Object.entries(textValues)
        .map(([id, v]) => `${config.permissions[id]?.label ?? id}: ${v}`)
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
        Editable fields
      </div>

      {!loaded && !loadError && (
        <div className="text-[12px] text-text-muted">Loading template…</div>
      )}

      {loadError && (
        <div className="text-[12px] text-[#a83232] bg-[#fbe9e9] border border-[#f1cccc] rounded-md px-3 py-2">
          {loadError}
        </div>
      )}

      {loaded && unlockedFields.length === 0 && (
        <div className="text-[12px] text-text-muted">
          This template has no customer-editable fields.
        </div>
      )}

      {loaded &&
        unlockedFields.map((field) => {
          if (field.type === "text") {
            return (
              <FieldRow key={field.id} label={field.label}>
                <input
                  type="text"
                  value={textValues[field.id] ?? ""}
                  onChange={(e) => updateText(field.id, e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-card-border bg-form-surface text-[13px] focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </FieldRow>
            );
          }
          if (field.type === "color") {
            return (
              <FieldRow key={field.id} label={field.label}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorValues[field.id] ?? "#000000"}
                    onChange={(e) => updateColor(field.id, e.target.value)}
                    className="w-10 h-9 p-0 border border-card-border rounded-md bg-white cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colorValues[field.id] ?? "#000000"}
                    onChange={(e) => updateColor(field.id, e.target.value)}
                    className="flex-1 h-9 px-2 rounded-md border border-card-border bg-form-surface text-[12px] font-mono uppercase"
                  />
                </div>
              </FieldRow>
            );
          }
          return null;
        })}
    </div>
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
      {loadError ? (
        <div className="text-[12px] text-text-muted text-center">
          Cannot render preview without a valid SVG URL.
        </div>
      ) : (
        <div ref={zoomOuterRef} className="shrink-0">
          <div
            ref={zoomInnerRef}
            className="bg-white border border-card-border rounded-card shadow-md"
          >
            <div ref={containerRef} className="w-full h-full" />
          </div>
        </div>
      )}
    </div>
    // ZOOM_FEATURE_END
  );

  return (
    <EditorShell
      config={config}
      leftPanel={leftPanel}
      canvasArea={canvasArea}
      // ZOOM_FEATURE_START
      topRightActions={
        <ZoomControls
          zoomPercent={zoom.zoomPercent}
          onZoomIn={zoom.zoomIn}
          onZoomOut={zoom.zoomOut}
          onReset={zoom.resetZoom}
          onSetZoom={zoom.setZoomPercent}
        />
      }
      // ZOOM_FEATURE_END
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

/**
 * Coerce odd fill formats (rgb(), short hex, named colors) into a 7-char hex
 * so the <input type="color"> control accepts them. Unknown formats fall back
 * to #000000.
 */
function normalizeColor(value: string): string {
  if (!value) return "#000000";
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) {
    return "#" + v.slice(1).split("").map((c) => c + c).join("");
  }
  const rgb = v.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rgb) {
    const [, r, g, b] = rgb;
    const hex = (n: string) =>
      Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0");
    return "#" + hex(r) + hex(g) + hex(b);
  }
  return "#000000";
}
