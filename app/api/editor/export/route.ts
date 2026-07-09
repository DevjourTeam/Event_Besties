import { NextResponse } from "next/server";
import { renderTemplateSVG, renderFabricJSON } from "@/lib/canvas-export";
import { uploadJPEG, uploadPNG } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

type ExportBody = {
  type: "template" | "canvas";
  templateId: string;
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
    if (body.type === "template") {
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
    } else if (body.fabricJSON) {
      pngBuffer = await renderFabricJSON(
        body.fabricJSON,
        body.displayW ?? 600,
        body.displayH ?? 800
      );
    } else {
      return NextResponse.json(
        { error: "Missing pngBase64 or fabricJSON" },
        { status: 400 }
      );
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
