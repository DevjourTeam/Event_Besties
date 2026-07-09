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

export type CanvasConfig = {
  type: "canvas";
  templateId: string;
  productName: string;
  shape: CanvasShape;
  /** SVG path string, used only when shape === "custom". */
  shapePath?: string;
  displayW: number;
  displayH: number;
  printWidthCm: number;
  printHeightCm: number;
  bleedPx: number;
  safePx: number;
  price: string;
  status: "published" | "draft";
  createdAt: string;
};

export type AnyConfig = TemplateConfig | CanvasConfig;

export type DashboardItem = {
  productId: string;
  config: AnyConfig;
};
