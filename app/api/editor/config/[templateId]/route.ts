import { NextResponse } from "next/server";
import { getProductMetafield, getProductImage } from "@/lib/shopify-admin";
import type { AnyConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/editor/config/[templateId]
 *
 * Looks up a product by id and returns whichever of template_config /
 * canvas_config exists on it. Templates take precedence if both are present.
 *
 * Used by:
 *   - the customer editor at /editor/[templateId]
 *   - the Shopify embed script (public/embed.js)
 *
 * No auth — this endpoint is reachable from the storefront.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  if (!templateId) {
    return NextResponse.json({ error: "Missing templateId" }, { status: 400 });
  }

  try {
    const [tmpl, cnv, productImage] = await Promise.all([
      getProductMetafield<AnyConfig>(templateId, "custom", "template_config"),
      getProductMetafield<AnyConfig>(templateId, "custom", "canvas_config"),
      getProductImage(templateId),
    ]);
    const config = tmpl ?? cnv;
    if (!config) {
      return NextResponse.json({ error: "Not configured" }, { status: 404 });
    }
    // The editor shows this as the product thumbnail in its bottom bar.
    return NextResponse.json({ ...config, productImage }, {
      headers: {
        // Loose CORS so embed.js on a Shopify domain can call us.
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
