"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { CanvasConfig, WithProductImage } from "@/lib/types";

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
export function CustomCanvasEditor({
  config,
}: {
  config: WithProductImage<CanvasConfig>;
}) {
  // variantId arrives on the URL when opened from a Shopify product page; it is
  // what the cart hand-off attaches the finished design to, AND — on a
  // multi-size product — which size the customer is designing at.
  const variantId = useSearchParams().get("variantId") ?? "";

  // Resolve the chosen size. Fall back to the top-level dimensions, which is
  // what single-size products (and anything created before sizes existed) have.
  const size = config.variants?.find((v) => v.variantId === variantId);
  const printWidthCm = size?.printWidthCm ?? config.printWidthCm;
  const printHeightCm = size?.printHeightCm ?? config.printHeightCm;

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
    sizeCm: { w: printWidthCm, h: printHeightCm },
    dpi: 150,
    background: { type: "none", value: null },
    mockup: null,
    // Shopify's featured image for this product — the bottom-bar thumbnail.
    productImage: config.productImage ?? null,
  };

  // Show the price and size the customer actually picked, not the base one.
  const price = size ? `£${size.priceGbp.toFixed(2)}` : config.price;
  const title = size ? `${config.productName} — ${size.label}` : config.productName;

  return (
    <CanvasEditorRoot
      doc={doc}
      productTitle={title}
      price={price}
      templateId={config.templateId}
      variantId={variantId}
    />
  );
}
