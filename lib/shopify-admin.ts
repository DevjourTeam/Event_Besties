/**
 * Shopify Admin API GraphQL client.
 * Uses the custom-app Admin API access token.
 */

const STORE = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const VERSION = process.env.SHOPIFY_API_VERSION ?? "2025-01";

const ADMIN_ENDPOINT = `https://${STORE}/admin/api/${VERSION}/graphql.json`;

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

async function adminFetch<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  if (!STORE || !TOKEN) {
    throw new Error(
      "Shopify Admin API not configured: set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_TOKEN"
    );
  }

  const res = await fetch(ADMIN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) {
    throw new Error(`Shopify Admin API error: ${json.errors.map((e) => e.message).join(", ")}`);
  }
  if (!json.data) {
    throw new Error("Shopify Admin API returned no data");
  }
  return json.data;
}

function toGid(kind: "Product" | "Order", id: string): string {
  if (id.startsWith("gid://")) return id;
  return `gid://shopify/${kind}/${id}`;
}

function numericFromGid(gid: string): string {
  const m = gid.match(/\/(\d+)(?:\?.*)?$/);
  return m ? m[1] : gid;
}

// =====================================================
// Metafield helpers
// =====================================================

export async function getProductMetafield<T = unknown>(
  productId: string,
  namespace: string,
  key: string
): Promise<T | null> {
  const data = await adminFetch<{
    product: { metafield: { value: string } | null } | null;
  }>(
    `query GetProductMetafield($id: ID!, $namespace: String!, $key: String!) {
       product(id: $id) {
         metafield(namespace: $namespace, key: $key) { value }
       }
     }`,
    { id: toGid("Product", productId), namespace, key }
  );

  const value = data.product?.metafield?.value;
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * The product's featured image — shown as the product thumbnail in the editor's
 * bottom bar. Returns null when the product has no image.
 */
export async function getProductImage(productId: string): Promise<string | null> {
  try {
    const data = await adminFetch<{
      product: { featuredImage: { url: string } | null } | null;
    }>(
      `query GetProductImage($id: ID!) {
         product(id: $id) { featuredImage { url } }
       }`,
      { id: toGid("Product", productId) }
    );
    return data.product?.featuredImage?.url ?? null;
  } catch {
    // Never let a missing image break the editor config.
    return null;
  }
}

export async function setProductMetafield(
  productId: string,
  namespace: string,
  key: string,
  value: unknown
): Promise<void> {
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  const data = await adminFetch<{
    metafieldsSet: {
      metafields: Array<{ id: string }> | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
       metafieldsSet(metafields: $metafields) {
         metafields { id }
         userErrors { field message }
       }
     }`,
    {
      metafields: [
        {
          ownerId: toGid("Product", productId),
          namespace,
          key,
          type: "json",
          value: stringValue,
        },
      ],
    }
  );

  if (data.metafieldsSet.userErrors.length) {
    throw new Error(
      `Shopify metafield set failed: ${data.metafieldsSet.userErrors
        .map((e) => `${e.field?.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }
}

export async function getOrderMetafield<T = unknown>(
  orderId: string,
  namespace: string,
  key: string
): Promise<T | null> {
  const data = await adminFetch<{
    order: { metafield: { value: string } | null } | null;
  }>(
    `query GetOrderMetafield($id: ID!, $namespace: String!, $key: String!) {
       order(id: $id) {
         metafield(namespace: $namespace, key: $key) { value }
       }
     }`,
    { id: toGid("Order", orderId), namespace, key }
  );

  const value = data.order?.metafield?.value;
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

export async function setOrderMetafield(
  orderId: string,
  namespace: string,
  key: string,
  value: unknown
): Promise<void> {
  const stringValue = typeof value === "string" ? value : JSON.stringify(value);
  const data = await adminFetch<{
    metafieldsSet: {
      metafields: Array<{ id: string }> | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation SetOrderMetafield($metafields: [MetafieldsSetInput!]!) {
       metafieldsSet(metafields: $metafields) {
         metafields { id }
         userErrors { field message }
       }
     }`,
    {
      metafields: [
        {
          ownerId: toGid("Order", orderId),
          namespace,
          key,
          type: "json",
          value: stringValue,
        },
      ],
    }
  );

  if (data.metafieldsSet.userErrors.length) {
    throw new Error(
      `Shopify order metafield set failed: ${data.metafieldsSet.userErrors
        .map((e) => `${e.field?.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }
}

// =====================================================
// Product listing
// =====================================================

export type ProductWithMetafield = {
  id: string;
  numericId: string;
  title: string;
  status: string;
  metafieldValue: unknown;
};

export async function listProductsWithMetafield(
  namespace: string,
  key: string
): Promise<ProductWithMetafield[]> {
  const out: ProductWithMetafield[] = [];
  let cursor: string | null = null;

  while (true) {
    const data: {
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: Array<{
          cursor: string;
          node: {
            id: string;
            title: string;
            status: string;
            metafield: { value: string } | null;
          };
        }>;
      };
    } = await adminFetch(
      `query ListProductsWithMetafield($cursor: String, $namespace: String!, $key: String!) {
         products(first: 100, after: $cursor) {
           pageInfo { hasNextPage endCursor }
           edges {
             cursor
             node {
               id
               title
               status
               metafield(namespace: $namespace, key: $key) { value }
             }
           }
         }
       }`,
      { cursor, namespace, key }
    );

    for (const edge of data.products.edges) {
      const raw = edge.node.metafield?.value;
      if (!raw) continue;
      let parsed: unknown = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        /* leave as string */
      }
      out.push({
        id: edge.node.id,
        numericId: edge.node.id.replace(/^gid:\/\/shopify\/Product\//, ""),
        title: edge.node.title,
        status: edge.node.status,
        metafieldValue: parsed,
      });
    }

    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor;
  }

  return out;
}

// =====================================================
// Product create flow (used by admin builder)
// =====================================================

export async function findProductByTitle(
  title: string
): Promise<{ productId: string; numericId: string; title: string } | null> {
  const escaped = title.replace(/"/g, '\\"');
  const data = await adminFetch<{
    products: { edges: Array<{ node: { id: string; title: string } }> };
  }>(
    `query FindProductByTitle($query: String!) {
       products(first: 5, query: $query) {
         edges { node { id title } }
       }
     }`,
    { query: `title:"${escaped}"` }
  );
  const match = data.products.edges.find(
    (e) => e.node.title.toLowerCase() === title.toLowerCase()
  );
  if (!match) return null;
  return {
    productId: match.node.id,
    numericId: numericFromGid(match.node.id),
    title: match.node.title,
  };
}

export type CreateProductInput = {
  title: string;
  descriptionHtml?: string;
  priceGbp: number;
  /**
   * Size option values, in order, e.g. ["5ft (150 x 74cm)", "6ft (180 x 90cm)"].
   * Given these, Shopify creates one variant per value and the storefront shows
   * a Size dropdown. Omit for a single-size product (one default variant).
   */
  sizeLabels?: string[];
};

export type CreatedVariant = {
  /** Numeric Shopify variant id. */
  numericId: string;
  /** The Size option value, so callers can match it back to their own size. */
  label: string;
};

export type CreateProductResult = {
  productId: string;
  numericId: string;
  defaultVariantId: string;
  numericVariantId: string;
  adminUrl: string;
  /** One entry per variant Shopify created, in the order it returned them. */
  variants: CreatedVariant[];
};

// Shopify dropped the `variants` field from ProductInput in 2024-07+. We
// create the product without variant details — Shopify auto-creates a
// single default variant at price 0 — then configure that variant via the
// REST variants endpoint (price + inventory policy) in one call.
export async function createProduct(
  input: CreateProductInput
): Promise<CreateProductResult> {
  const labels = input.sizeLabels?.filter((s) => s.trim().length > 0) ?? [];

  // Passing productOptions makes Shopify create one variant per option value, so
  // the storefront renders a Size dropdown. With no options it creates a single
  // "Default Title" variant, which is the old single-size behaviour.
  const productOptions = labels.length
    ? [{ name: "Size", values: labels.map((name) => ({ name })) }]
    : undefined;

  const data = await adminFetch<{
    productCreate: {
      product: {
        id: string;
        variants: {
          edges: Array<{
            node: { id: string; title: string; selectedOptions: Array<{ value: string }> };
          }>;
        };
      } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation CreateProduct($input: ProductInput!) {
       productCreate(input: $input) {
         product {
           id
           variants(first: 50) {
             edges { node { id title selectedOptions { value } } }
           }
         }
         userErrors { field message }
       }
     }`,
    {
      input: {
        title: input.title,
        descriptionHtml: input.descriptionHtml ?? "",
        status: "ACTIVE",
        ...(productOptions ? { productOptions } : {}),
      },
    }
  );

  if (data.productCreate.userErrors.length || !data.productCreate.product) {
    throw new Error(
      `productCreate failed: ${data.productCreate.userErrors
        .map((e) => `${e.field?.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }

  const product = data.productCreate.product;
  const edges = product.variants.edges;
  if (!edges.length) {
    throw new Error("productCreate returned product with no variants");
  }

  const variants: CreatedVariant[] = edges.map((e) => ({
    numericId: numericFromGid(e.node.id),
    // For an option'd product the option value IS the size label; a default
    // variant has none, so fall back to its title ("Default Title").
    label: e.node.selectedOptions?.[0]?.value ?? e.node.title,
  }));

  // productCreate does NOT fan an option out into one variant per value — it
  // creates the option and a SINGLE variant using the first value. Every other
  // size has to be added explicitly, or the product ships with one size.
  if (labels.length > 1) {
    const missing = labels.filter((l) => !variants.some((v) => v.label === l));
    if (missing.length) {
      const extra = await createVariants(product.id, missing);
      variants.push(...extra);
    }
  }

  const numericProductId = numericFromGid(product.id);

  return {
    productId: product.id,
    numericId: numericProductId,
    defaultVariantId: edges[0].node.id,
    numericVariantId: variants[0].numericId,
    adminUrl: `https://${STORE}/admin/products/${numericProductId}`,
    variants,
  };
}

/** Add one variant per Size option value that does not have one yet. */
async function createVariants(
  productGid: string,
  labels: string[]
): Promise<CreatedVariant[]> {
  const data = await adminFetch<{
    productVariantsBulkCreate: {
      productVariants: Array<{
        id: string;
        title: string;
        selectedOptions: Array<{ value: string }>;
      }> | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation AddVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
       productVariantsBulkCreate(productId: $productId, variants: $variants) {
         productVariants { id title selectedOptions { value } }
         userErrors { field message }
       }
     }`,
    {
      productId: productGid,
      variants: labels.map((name) => ({
        optionValues: [{ optionName: "Size", name }],
        inventoryPolicy: "CONTINUE",
      })),
    }
  );

  const res = data.productVariantsBulkCreate;
  if (res.userErrors.length) {
    throw new Error(
      `productVariantsBulkCreate failed: ${res.userErrors
        .map((e) => `${e.field?.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }

  return (res.productVariants ?? []).map((v) => ({
    numericId: numericFromGid(v.id),
    label: v.selectedOptions?.[0]?.value ?? v.title,
  }));
}

/**
 * Delete a product outright. Used to clean up after a failed create — a
 * half-made product would otherwise sit in the store AND block retries, since
 * we refuse to create a second product with the same title.
 */
export async function deleteProduct(numericProductId: string): Promise<void> {
  const data = await adminFetch<{
    productDelete: {
      deletedProductId: string | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation DeleteProduct($input: ProductDeleteInput!) {
       productDelete(input: $input) {
         deletedProductId
         userErrors { field message }
       }
     }`,
    { input: { id: `gid://shopify/Product/${numericProductId}` } }
  );

  const errs = data.productDelete.userErrors;
  if (errs.length) {
    throw new Error(
      `productDelete failed: ${errs.map((e) => e.message).join("; ")}`
    );
  }
}

/**
 * Price each variant separately — a 7ft board costs more than a 5ft one.
 * Also turns inventory tracking off so a made-to-order product never shows as
 * out of stock, matching what configureDefaultVariant does for single-size.
 */
export async function setVariantPrices(
  numericProductId: string,
  prices: Array<{ numericVariantId: string; priceGbp: number }>
): Promise<void> {
  if (!prices.length) return;

  const data = await adminFetch<{
    productVariantsBulkUpdate: {
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation SetPrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
       productVariantsBulkUpdate(productId: $productId, variants: $variants) {
         userErrors { field message }
       }
     }`,
    {
      productId: `gid://shopify/Product/${numericProductId}`,
      variants: prices.map((p) => ({
        id: `gid://shopify/ProductVariant/${p.numericVariantId}`,
        price: p.priceGbp.toFixed(2),
        inventoryPolicy: "CONTINUE",
      })),
    }
  );

  const errs = data.productVariantsBulkUpdate.userErrors;
  if (errs.length) {
    throw new Error(
      `setVariantPrices failed: ${errs
        .map((e) => `${e.field?.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }
}

export async function configureDefaultVariant(
  numericVariantId: string,
  priceGbp: number
): Promise<void> {
  const res = await fetch(
    `https://${STORE}/admin/api/${VERSION}/variants/${numericVariantId}.json`,
    {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        variant: {
          id: Number(numericVariantId),
          price: priceGbp.toFixed(2),
          inventory_management: null,
          inventory_policy: "continue",
        },
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(
      `configureDefaultVariant ${numericVariantId}: HTTP ${res.status} ${await res.text()}`
    );
  }
}

// Products created via the Admin API are NOT auto-published to sales
// channels — `status: ACTIVE` only marks the product as active. Manual
// admin creates publish to every channel by default; we replicate that
// by listing all publications and calling publishablePublish for each.
export async function publishProductToAllChannels(
  productGid: string
): Promise<void> {
  const data = await adminFetch<{
    publications: { edges: Array<{ node: { id: string; name: string } }> };
  }>(
    `query ListPublications {
       publications(first: 25) {
         edges { node { id name } }
       }
     }`
  );

  const pubs = data.publications.edges.map((e) => e.node);
  if (!pubs.length) return;

  const result = await adminFetch<{
    publishablePublish: {
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation Publish($id: ID!, $input: [PublicationInput!]!) {
       publishablePublish(id: $id, input: $input) {
         userErrors { field message }
       }
     }`,
    {
      id: productGid,
      input: pubs.map((p) => ({ publicationId: p.id })),
    }
  );

  if (result.publishablePublish.userErrors.length) {
    throw new Error(
      `publishablePublish failed: ${result.publishablePublish.userErrors
        .map((e) => `${e.field?.join(".")}: ${e.message}`)
        .join("; ")}`
    );
  }
}

// Shopify rejects product images larger than 20 MB or 5000x5000 px. We pass
// the image as a base64 string via productCreateMedia with a staged upload.
// Simpler approach: use the REST products/:id/images endpoint which accepts
// base64-encoded attachments directly.
export async function uploadProductImage(
  numericProductId: string,
  base64: string,
  filename: string
): Promise<void> {
  const res = await fetch(
    `https://${STORE}/admin/api/${VERSION}/products/${numericProductId}/images.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": TOKEN,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        image: { attachment: base64, filename },
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`uploadProductImage HTTP ${res.status}: ${text}`);
  }
}
