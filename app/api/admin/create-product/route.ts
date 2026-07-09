import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  configureDefaultVariant,
  createProduct,
  findProductByTitle,
  publishProductToAllChannels,
  setProductMetafield,
  uploadProductImage,
} from "@/lib/shopify-admin";
import type { AnyConfig } from "@/lib/types";

export const runtime = "nodejs";

type CreateBody = {
  kind: "template" | "canvas";
  title: string;
  description?: string;
  priceGbp?: number;
  imageDataUrl?: string;
  config: AnyConfig;
};

function parseDataUrl(
  dataUrl: string
): { base64: string; mimeType: string; filename: string } | null {
  const m = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!m) return null;
  const mimeType = m[1];
  const base64 = m[2];
  const ext = mimeType.split("/")[1]?.split("+")[0] ?? "bin";
  return { base64, mimeType, filename: `product.${ext}` };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (body.kind !== "template" && body.kind !== "canvas") {
    return NextResponse.json({ error: "kind must be template or canvas" }, { status: 400 });
  }
  if (!body.config || body.config.type !== body.kind) {
    return NextResponse.json(
      { error: `config.type must match kind (${body.kind})` },
      { status: 400 }
    );
  }

  try {
    const existing = await findProductByTitle(title);
    if (existing) {
      return NextResponse.json(
        {
          error: "product_exists",
          message: `A product titled "${existing.title}" already exists in Shopify. Pick a different title.`,
          productId: existing.numericId,
        },
        { status: 409 }
      );
    }

    const priceGbp = typeof body.priceGbp === "number" ? body.priceGbp : 0;

    const created = await createProduct({
      title,
      descriptionHtml: body.description?.trim() || "",
      priceGbp,
    });

    try {
      await configureDefaultVariant(created.numericVariantId, priceGbp);
    } catch (e) {
      console.warn("configureDefaultVariant failed", e);
    }

    try {
      await publishProductToAllChannels(created.productId);
    } catch (e) {
      console.warn("publishProductToAllChannels failed", e);
    }

    let imageError: string | null = null;
    if (body.imageDataUrl) {
      const parsed = parseDataUrl(body.imageDataUrl);
      if (!parsed) {
        imageError = "Invalid image data URL";
      } else {
        try {
          await uploadProductImage(created.numericId, parsed.base64, parsed.filename);
        } catch (e) {
          imageError = e instanceof Error ? e.message : "Image upload failed";
          console.warn("uploadProductImage failed", e);
        }
      }
    }

    const metafieldKey = body.kind === "template" ? "template_config" : "canvas_config";
    await setProductMetafield(created.numericId, "custom", metafieldKey, body.config);

    return NextResponse.json({
      ok: true,
      productId: created.numericId,
      variantId: created.numericVariantId,
      adminUrl: created.adminUrl,
      title,
      imageError,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Create product failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
