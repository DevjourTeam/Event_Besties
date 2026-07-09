import { listProductsWithMetafield } from "./shopify-admin";
import type { AnyConfig, DashboardItem } from "./types";

/**
 * Server-side loader for the admin dashboard.
 *
 * Reads template_config and canvas_config metafields from Shopify products.
 * Returns an empty list if Shopify has no matching products (the dashboard
 * renders a "No products yet" empty state) or if the request fails entirely.
 */
export async function loadDashboardItems(): Promise<{
  items: DashboardItem[];
  source: "shopify" | "empty";
}> {
  try {
    const [templates, canvases] = await Promise.all([
      listProductsWithMetafield("custom", "template_config"),
      listProductsWithMetafield("custom", "canvas_config"),
    ]);

    const items: DashboardItem[] = [];
    for (const p of templates) {
      const cfg = p.metafieldValue as AnyConfig | null;
      if (cfg && cfg.type === "template") {
        items.push({ productId: p.numericId, config: cfg });
      }
    }
    for (const p of canvases) {
      const cfg = p.metafieldValue as AnyConfig | null;
      if (cfg && cfg.type === "canvas") {
        items.push({ productId: p.numericId, config: cfg });
      }
    }

    return { items, source: "shopify" };
  } catch {
    return { items: [], source: "empty" };
  }
}
