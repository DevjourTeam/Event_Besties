/**
 * Shopify Storefront API GraphQL client.
 * Per project decision: same custom-app Admin token is used for the Storefront
 * endpoint as well. If a separate Storefront API token is later provided in
 * SHOPIFY_STOREFRONT_API_TOKEN, that one wins.
 */

const STORE = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const STOREFRONT_TOKEN =
  process.env.SHOPIFY_STOREFRONT_API_TOKEN || process.env.SHOPIFY_ADMIN_API_TOKEN || "";
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const STOREFRONT_ENDPOINT = `https://${STORE}/api/${VERSION}/graphql.json`;

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export async function storefrontFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!STORE || !STOREFRONT_TOKEN) {
    throw new Error(
      "Shopify Storefront API not configured: set SHOPIFY_STORE_DOMAIN and a Storefront/Admin token"
    );
  }

  const res = await fetch(STOREFRONT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify Storefront API HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(
      `Shopify Storefront API error: ${json.errors.map((e) => e.message).join(", ")}`
    );
  }
  if (!json.data) {
    throw new Error("Shopify Storefront API returned no data");
  }
  return json.data;
}
