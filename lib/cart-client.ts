/**
 * Client-side cart hand-off.
 *
 * Two execution contexts:
 *
 *   1. Iframe / Shopify embed — we're running on the Event Besties
 *      domain inside an iframe on the Shopify storefront. We CANNOT
 *      touch Shopify's session cookie from here, so we post the design
 *      payload to the parent window and let embed.js call Shopify's
 *      native /cart/add.js on the storefront origin. That's the cart
 *      the /cart page actually renders.
 *
 *   2. Standalone (direct /editor/[id] visit, admin preview, etc.) —
 *      no parent window. We fall back to the Storefront API via
 *      /api/cart/add, which returns its own checkoutUrl. Useful for
 *      internal testing; not the real customer flow.
 */

const CART_ID_KEY = "eb_cart_id";

export type DesignReadyPayload = {
  variantId: string;
  printUrl: string;
  previewUrl: string;
  templateId: string;
  designType: "template" | "canvas";
  customizationSummary?: string;
};

function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.parent != null && window.parent !== window;
  } catch {
    return true;
  }
}

/**
 * Hand the finished design off to be added to Shopify's cart and
 * navigate the shopper to /cart. In iframe mode this is done by the
 * parent (embed.js). In standalone mode we hit our Storefront API
 * fallback and navigate directly.
 */
export async function handoffDesign(payload: DesignReadyPayload): Promise<void> {
  if (typeof window === "undefined") return;

  if (isInIframe()) {
    window.parent.postMessage({ type: "DESIGN_READY", payload }, "*");
    return;
  }

  const res = await fetch("/api/cart/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      variantId: payload.variantId,
      cartId: localStorage.getItem(CART_ID_KEY),
      quantity: 1,
      attributes: [
        { key: "_Print file", value: payload.printUrl },
        { key: "_Preview", value: payload.previewUrl },
        { key: "_template_id", value: payload.templateId },
        { key: "_design_type", value: payload.designType },
        ...(payload.customizationSummary
          ? [{ key: "Customization", value: payload.customizationSummary }]
          : []),
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Add to cart failed");
  localStorage.setItem(CART_ID_KEY, data.cartId);
  window.location.href = data.checkoutUrl;
}
