import { NextResponse } from "next/server";
import { storefrontFetch } from "@/lib/shopify-storefront";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Attribute = { key: string; value: string };

type AddBody = {
  variantId: string;
  attributes: Attribute[];
  cartId?: string;
  quantity?: number;
};

const CART_CREATE_MUTATION = `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id
        checkoutUrl
      }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
      }
      userErrors { field message }
    }
  }
`;

function toGid(variantId: string): string {
  if (variantId.startsWith("gid://")) return variantId;
  return `gid://shopify/ProductVariant/${variantId}`;
}

/**
 * POST /api/cart/add
 *
 * Creates a cart on first call (when cartId is missing) or appends a line
 * to the existing cart. Returns the cart id and Shopify checkout URL.
 *
 * Public — called from the customer editor after export succeeds.
 */
export async function POST(req: Request) {
  let body: AddBody;
  try {
    body = (await req.json()) as AddBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.variantId) {
    return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
  }

  const lines = [
    {
      merchandiseId: toGid(body.variantId),
      quantity: body.quantity ?? 1,
      attributes: body.attributes ?? [],
    },
  ];

  try {
    if (!body.cartId) {
      const data = await storefrontFetch<{
        cartCreate: {
          cart: { id: string; checkoutUrl: string } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(CART_CREATE_MUTATION, { lines });
      if (data.cartCreate.userErrors.length || !data.cartCreate.cart) {
        const message = data.cartCreate.userErrors.map((e) => e.message).join("; ") || "cartCreate failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
      return NextResponse.json({
        cartId: data.cartCreate.cart.id,
        checkoutUrl: data.cartCreate.cart.checkoutUrl,
      });
    }

    const data = await storefrontFetch<{
      cartLinesAdd: {
        cart: { id: string; checkoutUrl: string } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(CART_LINES_ADD_MUTATION, { cartId: body.cartId, lines });
    if (data.cartLinesAdd.userErrors.length || !data.cartLinesAdd.cart) {
      const message = data.cartLinesAdd.userErrors.map((e) => e.message).join("; ") || "cartLinesAdd failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({
      cartId: data.cartLinesAdd.cart.id,
      checkoutUrl: data.cartLinesAdd.cart.checkoutUrl,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cart add failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
