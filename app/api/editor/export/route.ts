import { NextResponse } from "next/server";
import {
  renderTemplateSVG,
  renderTemplateV2,
} from "@/lib/canvas-export";
import { uploadJPEG, uploadPNG } from "@/lib/cloudinary";
import { getProductMetafield } from "@/lib/shopify-admin";
import { isTemplateV2, type TemplateConfig } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Nothing legitimate needs more; the cap exists so a field can't be used as a payload. */
const MAX_TEXT_LEN = 500;

type ExportBody = {
  type: "template" | "canvas";
  templateId: string;
  /** v2 only. Present => take the composed path and ignore any svgString. */
  version?: 2;
  /** v2 only. The Shopify product to read the pristine template back from. */
  productId?: string;
  /** v2 only. nodeId -> customer text. */
  textValues?: Record<string, string>;
  /** v2 only. nodeId -> "left" | "center" | "right". Absent = as designed. */
  alignValues?: Record<string, string>;
  /** v2 only. nodeId -> customer colour. */
  colorValues?: Record<string, string>;
  svgString?: string;
  fabricJSON?: unknown;
  /** Canvas mode: a client-rendered print PNG data URL (WYSIWYG). Preferred. */
  pngBase64?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  displayW?: number;
  displayH?: number;
  printWidthCm?: number;
  printHeightCm?: number;
  fonts?: string[];
};

/**
 * Build the print for a v2 template.
 *
 * The whole point of this function is what it does NOT read from the request:
 * no artwork, no fonts, no geometry, no notion of which fields are editable.
 * All of that is re-read from the template stored against the Shopify product.
 * The request contributes values, and only for fields the stored config marks
 * editable — so a customer editing the DOM in devtools changes their screen and
 * nothing else.
 */
async function renderV2(body: ExportBody): Promise<Buffer> {
  if (!body.productId) throw new Error("Missing productId");

  const config = await getProductMetafield<TemplateConfig>(
    body.productId,
    "custom",
    "template_config"
  );
  if (!config) throw new Error("Template not found");
  if (!isTemplateV2(config)) throw new Error("Not a v2 template");

  const res = await fetch(config.sourceSvgUrl);
  if (!res.ok) throw new Error(`Could not load template artwork (${res.status})`);
  const preparedSvg = await res.text();

  // Accept a value only where OUR config says the field is editable. A field the
  // config marks locked keeps its authored copy no matter what was posted.
  const textValues: Record<string, string> = {};
  for (const f of config.textFields) {
    if (!f.editable) continue;
    const v = body.textValues?.[f.nodeId];
    textValues[f.nodeId] = (typeof v === "string" ? v : f.value).slice(
      0,
      MAX_TEXT_LEN
    );
  }

  // Alignment, same rule as the text: only where the config says the field is
  // editable, and only a value alignment can legally take. Anything else falls
  // back to the artwork's own layout.
  const ALIGNMENTS = ["left", "center", "right"] as const;
  const alignOf = (nodeId: string, editable: boolean) => {
    if (!editable) return undefined;
    const v = body.alignValues?.[nodeId];
    return ALIGNMENTS.find((a) => a === v);
  };

  // Colour is not customer-editable in v2 — the artwork's own fills stand.
  return renderTemplateV2(
    preparedSvg,
    {
      textFields: config.textFields.map((f) => ({
        nodeId: f.nodeId,
        fontFamily: f.fontFamily,
        fontSize: f.fontSize,
        fill: f.fill,
        align: alignOf(f.nodeId, f.editable),
      })),
      textValues,
      colorValues: {},
    },
    config.canvasWidth,
    config.canvasHeight,
    config.requiredFonts,
    config.customFonts
  );
}

/**
 * POST /api/editor/export
 *
 * Returns { printUrl, previewUrl } — the high-resolution PNG + a JPEG
 * thumbnail for line-item display in the cart.
 *
 * Public (no auth) because the customer editor is anonymous.
 */
export async function POST(req: Request) {
  let body: ExportBody;
  try {
    body = (await req.json()) as ExportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.type || !body.templateId) {
    return NextResponse.json(
      { error: "Missing type or templateId" },
      { status: 400 }
    );
  }

  try {
    let pngBuffer: Buffer;
    if (body.type === "template" && body.version === 2) {
      // Composed server-side from the stored template. svgString is ignored
      // here even if present — see renderV2.
      pngBuffer = await renderV2(body);
    } else if (body.type === "template") {
      if (!body.svgString) {
        return NextResponse.json({ error: "Missing svgString" }, { status: 400 });
      }
      pngBuffer = await renderTemplateSVG(
        body.svgString,
        body.canvasWidth ?? 800,
        body.canvasHeight ?? 1010,
        body.fonts
      );
    } else if (body.pngBase64) {
      // Preferred canvas path: the editor already rendered the design to a
      // print-resolution PNG on the client, so what the customer saw is exactly
      // what prints. We just decode + upload it — no server-side re-render.
      const b64 = body.pngBase64.replace(/^data:image\/\w+;base64,/, "");
      pngBuffer = Buffer.from(b64, "base64");
      if (!pngBuffer.length) {
        return NextResponse.json({ error: "Empty pngBase64" }, { status: 400 });
      }
    } else {
      // The `fabricJSON` server-render path was removed: no client used it, and
      // rendering arbitrary client JSON (with image URLs) in headless Chrome is
      // an SSRF vector. The canvas editor uploads a finished PNG instead.
      return NextResponse.json({ error: "Missing pngBase64" }, { status: 400 });
    }

    const stamp = `${body.templateId}_${Date.now()}`;
    const [printUpload, previewUpload] = await Promise.all([
      uploadPNG(pngBuffer, "print", stamp),
      uploadJPEG(pngBuffer, "preview", stamp, { width: 800 }),
    ]);

    return NextResponse.json({
      printUrl: printUpload.secure_url,
      previewUrl: previewUpload.secure_url,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
