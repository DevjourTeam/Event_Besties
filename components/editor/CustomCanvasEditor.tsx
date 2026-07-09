"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { CanvasConfig } from "@/lib/types";

// The custom editor is client-only (Fabric.js needs the DOM). Load it with
// ssr:false — allowed here because this file is a Client Component. This is the
// same pattern the old FreeEditor used to import Fabric.
const CanvasEditorRoot = dynamic(() => import("./canvas/CanvasEditorRoot"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center text-[13px] text-text-muted">
      Loading designer…
    </div>
  ),
});

/**
 * Mode 2 (replacement) — our custom Photoshop-level canvas editor.
 *
 * Maps the Shopify CanvasConfig into the editor's `doc` descriptor and mounts
 * the editor. Custom product shapes (arched / cutout) will map through
 * doc.shape.svgPath once the CanvasConfig grows a shape-path field; today it is
 * a full rectangle, matching the current builder output.
 */
export function CustomCanvasEditor({ config }: { config: CanvasConfig }) {
  // variantId arrives on the URL when opened from a Shopify product page; it is
  // what the cart hand-off attaches the finished design to.
  const variantId = useSearchParams().get("variantId") ?? "";

  // Map the stored shape into the editor's doc.shape. A custom cut carries an
  // svgPath; named presets (arch/circle/…) are generated geometrically.
  const shape =
    config.shape === "custom" && config.shapePath
      ? { type: "path", svgPath: config.shapePath }
      : { type: config.shape || "rect", svgPath: null };

  const doc = {
    id: config.templateId,
    name: config.productName,
    shape,
    sizeCm: { w: config.printWidthCm, h: config.printHeightCm },
    dpi: 150,
    background: { type: "none", value: null },
    mockup: null,
  };

  return (
    <CanvasEditorRoot
      doc={doc}
      productTitle={config.productName}
      price={config.price}
      templateId={config.templateId}
      variantId={variantId}
    />
  );
}
