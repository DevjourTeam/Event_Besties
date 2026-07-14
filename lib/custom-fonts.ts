import type { CustomFont } from "./types";

/**
 * Uploaded (non-Google) webfaces.
 *
 * The customer editor, the builder preview and the Puppeteer print renderer all
 * draw the same design, so all three need the same @font-face rules or the print
 * silently comes out in a fallback face. One builder, used by all of them.
 */

/** file extension -> the token CSS src format() expects. */
export const FONT_FORMATS: Record<string, string> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
};

export function isSupportedFontExt(ext: string): boolean {
  return ext.toLowerCase() in FONT_FORMATS;
}

/**
 * @font-face CSS for a set of uploaded fonts.
 *
 * font-display: block, not swap — a swap would let the renderer paint a fallback
 * face first, and Puppeteer screenshots fast enough to catch exactly that.
 */
export function fontFaceCss(fonts: CustomFont[] | undefined): string {
  if (!fonts?.length) return "";
  return fonts
    .map(
      (f) => `@font-face{font-family:'${f.family.replace(/'/g, "")}';src:url('${
        f.url
      }') format('${f.format}');font-display:block;}`
    )
    .join("\n");
}

/** True when this family is one the admin uploaded for this template. */
export function isCustomFont(
  family: string,
  fonts: CustomFont[] | undefined
): boolean {
  const f = family.trim().toLowerCase();
  return !!fonts?.some((c) => c.family.trim().toLowerCase() === f);
}
