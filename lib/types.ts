/**
 * Shared types for template and canvas configs stored in Shopify metafields.
 */

export type PermissionType = "text" | "color" | "locked";

export type ElementPermission = {
  type: PermissionType;
  label: string;
  locked: boolean;
};

export type TemplateConfig = {
  type: "template";
  templateId: string;
  productName: string;
  svgUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  permissions: Record<string, ElementPermission>;
  price: string;
  status: "published" | "draft";
  createdAt: string;
  /**
   * Font families detected in the SVG at upload time. The customer
   * editor injects these as Google Fonts so editable text renders in
   * the same typeface the admin used in Illustrator. Optional for
   * backward compatibility with pre-fonts templates.
   */
  requiredFonts?: string[];
};

/**
 * Product cut shape for a canvas. Named presets are generated geometrically by
 * the editor (see editor/shapes.js); "custom" pairs with `shapePath`, an SVG
 * path string that the editor scales to the print box. This is what lets any
 * product cut (sailboard arch, circle sign, bear cutout) load — not just a rect.
 */
export type CanvasShape =
  | "rect"
  | "arch"
  | "circle"
  | "ellipse"
  | "rounded"
  | "custom";

/**
 * One purchasable size of a canvas product — a Shopify variant plus the print
 * dimensions the editor must use when the customer picks it.
 *
 * `variantId` is the numeric Shopify variant id. It is empty while the admin is
 * still designing the product and is filled in by the create-product route once
 * Shopify has actually made the variants — that mapping is what lets the editor
 * tell which size was chosen.
 */
export type CanvasSizeVariant = {
  /** Numeric Shopify variant id. Empty until the product is created. */
  variantId: string;
  /** Shown in the storefront Size dropdown, e.g. "6ft (180 x 90cm)". */
  label: string;
  printWidthCm: number;
  printHeightCm: number;
  /** GBP, e.g. 89.99 — each size is priced separately. */
  priceGbp: number;
};

export type CanvasConfig = {
  type: "canvas";
  templateId: string;
  productName: string;
  shape: CanvasShape;
  /** SVG path string, used only when shape === "custom". */
  shapePath?: string;
  displayW: number;
  displayH: number;
  /**
   * The print size. On a multi-size product these mirror the FIRST variant and
   * act as the fallback: products created before sizes existed have no
   * `variants`, and the editor still needs a size for them.
   */
  printWidthCm: number;
  printHeightCm: number;
  bleedPx: number;
  safePx: number;
  price: string;
  status: "published" | "draft";
  createdAt: string;
  /**
   * Size variants, in dropdown order. Absent on single-size products created
   * before this existed — treat as "no choice, use the top-level size".
   */
  variants?: CanvasSizeVariant[];
};

/**
 * Fields the config API adds on top of the stored metafield (not persisted).
 * `productImage` is the product's featured image, used as the editor thumbnail.
 */
export type WithProductImage<T> = T & { productImage?: string | null };

export type AnyConfig = TemplateConfig | CanvasConfig;

export type DashboardItem = {
  productId: string;
  config: AnyConfig;
};
