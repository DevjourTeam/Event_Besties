/**
 * Shared types for template and canvas configs stored in Shopify metafields.
 */

export type PermissionType = "text" | "color" | "locked";

export type ElementPermission = {
  type: PermissionType;
  label: string;
  locked: boolean;
};

/**
 * One editable line of type, discovered by reading the SVG's <text> elements.
 * There is no naming convention to follow: `nodeId` is a marker the builder
 * writes into the SVG at upload, so nothing depends on how Illustrator was set up.
 *
 * `fontFamily` is the Google family the editor will actually render.
 * `originalFont` is whatever Illustrator wrote — kept only so the admin can see
 * what they were remapping away from.
 */
export type TemplateTextField = {
  /** Marker written into the SVG as data-tf, e.g. "tf0". */
  nodeId: string;
  label: string;
  /** False = baked in, customer never sees a control for it. */
  editable: boolean;
  /** The copy as it appears in the artwork; the editor's starting value. */
  value: string;
  fontFamily: string;
  originalFont: string;
  fontSize: number;
  fill: string;
};

/**
 * A colour the customer may change. Slots are keyed by the fill value itself,
 * not by element — expose "#E8506E" once and every strawberry follows. That is
 * how designers already think, and it needs no layer naming.
 */
export type TemplateColorSlot = {
  /** Marker written into the SVG as data-cs, e.g. "cs0". */
  nodeId: string;
  label: string;
  /** The colour as authored, and the editor's starting value. */
  hex: string;
  exposed: boolean;
  /** How many elements use this fill — shown to the admin, not the customer. */
  count: number;
};

/**
 * A font the admin uploaded because the artwork uses a face Google doesn't host.
 * Served from Cloudinary and injected as an @font-face wherever the design is
 * drawn — the customer editor, the builder preview, and the print renderer — so
 * a licensed script face renders as authored instead of falling back.
 *
 * `family` must be exactly the name used in the text field's `fontFamily`, or
 * the @font-face won't match. It is read out of the font file itself at upload,
 * not typed, so the two cannot disagree.
 */
export type CustomFont = {
  family: string;
  url: string;
  /** CSS src format(): "woff2" | "woff" | "truetype" | "opentype". */
  format: string;
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

  /* ---------------------------------------------------------------------
   * v2 — auto-extracted fields. Present only on templates built with the
   * new builder. Absent (undefined) on v1 templates, which keep running
   * through the original permissions path untouched. `permissions` stays
   * required and is written as {} on v2 so nothing that reads it breaks.
   * ------------------------------------------------------------------ */

  /** Discriminator. `undefined` means v1. */
  version?: 2;
  /**
   * The prepared SVG: the original artwork with data-tf / data-cs markers
   * injected. Styling is untouched, so it renders identically to what the
   * admin exported. This is the pristine source the SERVER recomposes from
   * at print time — it never trusts SVG sent up by the browser.
   */
  sourceSvgUrl?: string;
  textFields?: TemplateTextField[];
  /**
   * Colour swatches. Extraction still runs and the data-cs markers are still
   * written, but the builder does not expose them: templates are text-only for
   * now, so this ships as []. Turning colour back on is a UI change, not a
   * format change — existing templates would not need rebuilding.
   */
  colorSlots?: TemplateColorSlot[];
  /** Uploaded faces, for artwork whose type isn't on Google Fonts. */
  customFonts?: CustomFont[];
};

/** True when this template was built by the v2 (auto-extract) builder. */
export function isTemplateV2(
  c: TemplateConfig
): c is TemplateConfig & {
  version: 2;
  sourceSvgUrl: string;
  textFields: TemplateTextField[];
  colorSlots: TemplateColorSlot[];
} {
  return c.version === 2 && typeof c.sourceSvgUrl === "string" && !!c.textFields;
}

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
 * `productId` is the Shopify product the config was read from — the v2 print
 * path sends it back so the server can re-fetch the pristine config itself
 * instead of trusting artwork uploaded by the browser. Note this is NOT
 * `config.templateId`, which is our own `tpl_…` handle and cannot address a
 * Shopify metafield.
 */
export type WithProductImage<T> = T & {
  productImage?: string | null;
  productId?: string;
};

export type AnyConfig = TemplateConfig | CanvasConfig;

export type DashboardItem = {
  productId: string;
  config: AnyConfig;
};
