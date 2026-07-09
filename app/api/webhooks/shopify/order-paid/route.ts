import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { setOrderMetafield } from "@/lib/shopify-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShopifyLineItemProperty = { name: string; value: string };

type ShopifyLineItem = {
  id: number;
  sku?: string | null;
  title?: string;
  quantity?: number;
  properties?: ShopifyLineItemProperty[] | null;
};

type ShopifyOrder = {
  id: number;
  name?: string;
  email?: string;
  shipping_address?: Record<string, unknown>;
  line_items: ShopifyLineItem[];
};

function verifyHmac(rawBody: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) return false;
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return false;
  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(hmacHeader)
    );
  } catch {
    return false;
  }
}

function findProp(
  props: ShopifyLineItemProperty[] | null | undefined,
  name: string
): string | undefined {
  return props?.find((p) => p.name === name)?.value;
}

/**
 * POST /api/webhooks/shopify/order-paid
 *
 * Configure in Shopify Admin → Settings → Notifications → Webhooks:
 *   Event:   Order paid
 *   Format:  JSON
 *   URL:     https://event-besties.vercel.app/api/webhooks/shopify/order-paid
 *
 * For every line item that carries the `_print_file_url` line item property
 * (set by the editor's add-to-cart flow), we persist a `custom.design_data`
 * metafield on the order so the fulfillment side has everything it needs.
 *
 * The POD supplier call is left as a TODO — wire it up when you choose
 * Printful / Printify / Gelato.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody) as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!order?.id || !Array.isArray(order.line_items)) {
    return NextResponse.json({ error: "Malformed order" }, { status: 400 });
  }

  const designLines: Array<{
    lineItemId: number;
    sku: string | null;
    templateId: string | null;
    designType: string | null;
    printFileUrl: string;
    previewUrl: string | null;
  }> = [];

  for (const item of order.line_items) {
    // New keys are "_Print file" and "_Preview" (Shopify auto-linkifies
    // URL values in admin). Old keys "_print_file_url" / "_preview_url"
    // are kept as fallback for any in-flight orders placed before the
    // rename.
    const printUrl =
      findProp(item.properties, "_Print file") ??
      findProp(item.properties, "_print_file_url");
    if (!printUrl) continue;
    designLines.push({
      lineItemId: item.id,
      sku: item.sku ?? null,
      templateId: findProp(item.properties, "_template_id") ?? null,
      designType: findProp(item.properties, "_design_type") ?? null,
      printFileUrl: printUrl,
      previewUrl:
        findProp(item.properties, "_Preview") ??
        findProp(item.properties, "_preview_url") ??
        null,
    });
  }

  if (designLines.length === 0) {
    // Not an Event Besties order — ack so Shopify stops retrying.
    return NextResponse.json({ ok: true, designLines: 0 });
  }

  try {
    await setOrderMetafield(String(order.id), "custom", "design_data", {
      orderId: order.id,
      orderName: order.name ?? null,
      capturedAt: new Date().toISOString(),
      lines: designLines,
      fulfilledAt: null,
    });

    // TODO: hand off to POD supplier here.
    // for (const line of designLines) {
    //   await callPODSupplier({
    //     printUrl: line.printFileUrl,
    //     sku: line.sku,
    //     shippingAddress: order.shipping_address,
    //   });
    // }

    return NextResponse.json({ ok: true, designLines: designLines.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
