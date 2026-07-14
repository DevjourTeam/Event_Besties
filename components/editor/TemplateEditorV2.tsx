"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EditorShell } from "./EditorShell";
import { useToast } from "@/components/Toast";
import { handoffDesign } from "@/lib/cart-client";
import { googleFontsHrefFor } from "@/lib/google-fonts";
import { fontFaceCss } from "@/lib/custom-fonts";
import { composeSvg } from "@/lib/svg-template";
import { fitTextFields, type TextAlign } from "@/lib/svg-fit";
import type { TemplateConfig, WithProductImage } from "@/lib/types";
import { useCanvasZoom } from "@/hooks/useCanvasZoom";
import { ZoomControls } from "./ZoomControls";

type V2Config = WithProductImage<
  TemplateConfig & { version: 2; sourceSvgUrl: string }
>;

/** The composed artwork lives here; fitTextFields addresses it by id. */
const CANVAS_ID = "eb-template-canvas";

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
  const editableFields = useMemo(() => fields.filter((f) => f.editable), [fields]);

  // Which size the customer chose on the product page. A template's artwork is
  // the same at every size — only the price differs — but they still need to see
  // which one they are buying, so it is named in the header alongside its price.
  const selectedSize = useMemo(
    () => config.variants?.find((v) => v.variantId === variantId),
    [config.variants, variantId]
  );
  const shellConfig = useMemo(
    () =>
      selectedSize
        ? {
            ...config,
            productName: `${config.productName} — ${selectedSize.label}`,
            price: `£${selectedSize.priceGbp.toFixed(2)}`,
          }
        : config,
    [config, selectedSize]
  );

  const [sourceSvg, setSourceSvg] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [textValues, setTextValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.nodeId, f.value]))
  );

  // Absent = "as designed". Only an explicit choice overrides the artwork's own
  // layout, so a customer who never touches this sees exactly what the designer
  // drew — indents and all.
  const [alignValues, setAlignValues] = useState<Record<string, TextAlign>>({});

  // Every font the design needs, from whichever of the two sources hosts it.
  // Miss these and the type silently falls back and the design looks broken —
  // the builder guarantees each one resolves, so this always lands.
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
    const css = fontFaceCss(config.customFonts);
    if (!css) return;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, [config.customFonts]);

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
    let cancelled = false;
    try {
      containerRef.current.innerHTML = composeSvg(sourceSvg, {
        textFields: fields.map((f) => ({
          nodeId: f.nodeId,
          fontFamily: f.fontFamily,
          fontSize: f.fontSize,
          fill: f.fill,
        })),
        textValues,
        colorValues: {},
      });
      const svg = containerRef.current.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", String(config.canvasWidth));
        svg.setAttribute("height", String(config.canvasHeight));
      }

      // Shrink anything the customer overflowed back inside the artboard. The
      // print renderer runs this same function, so what they see is what prints.
      //
      // The fonts must be LOADED first, not merely "ready". A browser fetches a
      // webfont lazily — it will not touch the file until layout proves an
      // element needs it — so fonts.ready can resolve while the face has not been
      // requested at all. Fit then measures a fallback, gets every width wrong,
      // and the real face lands afterwards, still overflowing. So ask for each
      // family by name and only then measure.
      const fit = () => {
        if (cancelled || !containerRef.current) return;
        fitTextFields(
          `#${CANVAS_ID}`,
          sourceSvg,
          fields.map((f) => ({
            nodeId: f.nodeId,
            fontSize: f.fontSize,
            align: alignValues[f.nodeId],
          }))
        );
      };
      const families = [
        ...(config.requiredFonts ?? []),
        ...(config.customFonts ?? []).map((f) => f.family),
      ];
      if (document.fonts && families.length) {
        Promise.all(
          families.map((f) =>
            document.fonts.load(`400 64px '${f}'`).catch(() => undefined)
          )
        )
          .then(() => document.fonts.ready)
          .then(fit);
      } else {
        fit();
      }
    } catch {
      setLoadError("Could not render this template");
    }
    return () => {
      cancelled = true;
    };
  }, [
    sourceSvg,
    fields,
    textValues,
    alignValues,
    config.canvasWidth,
    config.canvasHeight,
    config.requiredFonts,
    config.customFonts,
  ]);

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
          alignValues,
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

      {sourceSvg && editableFields.length === 0 && (
        <div className="text-[12px] text-text-muted">
          This template has no customer-editable fields.
        </div>
      )}

      {sourceSvg &&
        editableFields.map((f) => (
          <FieldRow key={f.nodeId} label={f.label}>
            {/* A textarea, not an input: the customer has to be able to press
                Enter and put the next word on its own line. The artwork re-fits
                itself around the extra lines (see fitTextFields). */}
            <textarea
              rows={Math.min(6, (textValues[f.nodeId] ?? "").split("\n").length || 1)}
              value={textValues[f.nodeId] ?? ""}
              onChange={(e) =>
                setTextValues((v) => ({ ...v, [f.nodeId]: e.target.value }))
              }
              className="w-full min-h-9 px-3 py-2 rounded-md border border-card-border bg-form-surface text-[13px] leading-snug resize-y focus:outline-none focus:ring-2 focus:ring-gold/40"
            />

            <div className="mt-2 flex items-center gap-1">
              <AlignButton
                active={!alignValues[f.nodeId]}
                title="As designed"
                onClick={() =>
                  setAlignValues((v) => {
                    const next = { ...v };
                    delete next[f.nodeId];
                    return next;
                  })
                }
              >
                <span className="text-[9px] tracking-[0.06em] uppercase px-0.5">
                  Auto
                </span>
              </AlignButton>

              {(["left", "center", "right"] as const).map((a) => (
                <AlignButton
                  key={a}
                  active={alignValues[f.nodeId] === a}
                  title={`Align ${a}`}
                  onClick={() =>
                    setAlignValues((v) => ({ ...v, [f.nodeId]: a }))
                  }
                >
                  <AlignIcon align={a} />
                </AlignButton>
              ))}
            </div>

            <p className="mt-1 text-[10px] text-text-muted">
              Press Enter for a new line
            </p>
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
            <div id={CANVAS_ID} ref={containerRef} className="w-full h-full [&>svg]:block" />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <EditorShell
      config={shellConfig}
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

function AlignButton({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-md border text-[11px] transition-colors ${
        active
          ? "bg-[#1b2333] border-[#1b2333] text-white"
          : "bg-white border-card-border text-text-muted hover:bg-form-surface"
      }`}
    >
      {children}
    </button>
  );
}

/** Three bars, ragged on the side the text would be ragged on. */
function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  const rows = [10, 6, 9, 5];
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      {rows.map((w, i) => {
        const x = align === "left" ? 1.5 : align === "right" ? 11.5 - w : (13 - w) / 2;
        return (
          <rect
            key={i}
            x={x}
            y={2 + i * 2.6}
            width={w}
            height={1.3}
            rx={0.6}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
