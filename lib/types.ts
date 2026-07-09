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

export type CanvasConfig = {
  type: "canvas";
  templateId: string;
  productName: string;
  shape: "rect";
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
