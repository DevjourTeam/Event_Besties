import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  configureDefaultVariant,
  createProduct,
  deleteProduct,
  findProductByTitle,
  publishProductToAllChannels,
  setProductMetafield,
  setVariantPrices,
  uploadProductImage,
} from "@/lib/shopify-admin";
import type { AnyConfig, CanvasConfig, TemplateConfig } from "@/lib/types";

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

    // Either kind of product may define several sizes. Each becomes a Shopify
    // variant under a "Size" option, so the customer must choose one before
    // ordering. A canvas size also carries print dimensions; a template's does
    // not (the artwork is fixed, only the price differs) — but Shopify only
    // needs the label and the price either way, so this path is common to both.
    const sizes: Array<{ label: string; priceGbp: number }> =
      (body.config as CanvasConfig | TemplateConfig).variants ?? [];
    const isMultiSize = sizes.length > 0;

    const created = await createProduct({
      title,
      descriptionHtml: body.description?.trim() || "",
      priceGbp,
      ...(isMultiSize ? { sizeLabels: sizes.map((s) => s.label) } : {}),
    });

    // Everything past this point can fail with a product already in Shopify.
    // If it does, delete that product: a half-made one is worse than none — it
    // would sit in the store with no config AND block the retry, because we
    // refuse to create a second product with the same title.
    try {
      if (isMultiSize) {
        // Match Shopify's variants back to our sizes BY LABEL, not by position —
        // Shopify does not promise to return them in the order we sent.
        const priced = sizes
          .map((s) => {
            const v = created.variants.find((cv) => cv.label === s.label);
            return v ? { numericVariantId: v.numericId, priceGbp: s.priceGbp } : null;
          })
          .filter((p): p is { numericVariantId: string; priceGbp: number } => p !== null);

        if (priced.length !== sizes.length) {
          throw new Error(
            `Shopify created ${created.variants.length} variants but only ${priced.length} of ${sizes.length} sizes matched by label`
          );
        }
        await setVariantPrices(created.numericId, priced);
      } else {
        try {
          await configureDefaultVariant(created.numericVariantId, priceGbp);
        } catch (e) {
          console.warn("configureDefaultVariant failed", e);
        }
      }
    } catch (e) {
      try {
        await deleteProduct(created.numericId);
      } catch (cleanupErr) {
        console.error("cleanup deleteProduct failed", cleanupErr);
        throw new Error(
          `${e instanceof Error ? e.message : "Create failed"} — and the half-made product could not be removed. Delete "${title}" in Shopify admin before retrying.`
        );
      }
      throw e;
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

    // Stamp Shopify's real variant ids into the config. This is the link the
    // editor uses to turn "?variantId=123" into the right print dimensions —
    // without it a multi-size product has no way to know which size was picked.
    let config: AnyConfig = body.config;
    if (isMultiSize) {
      // Works for both kinds: whatever fields a size carries are spread through
      // untouched, and only variantId is filled in.
      config = {
        ...body.config,
        variants: sizes.map((s) => ({
          ...s,
          variantId:
            created.variants.find((cv) => cv.label === s.label)?.numericId ?? "",
        })),
      } as AnyConfig;
    }

    const metafieldKey = body.kind === "template" ? "template_config" : "canvas_config";
    await setProductMetafield(created.numericId, "custom", metafieldKey, config);

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
