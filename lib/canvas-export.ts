/**
 * Server-side rendering for the customer editor's "Process" button.
 *
 * - Template mode: takes the patched SVG string and screenshots it via
 *   Puppeteer at deviceScaleFactor 3 (≈300dpi for typical print sizes).
 * - Canvas mode: takes a Fabric.js JSON snapshot, builds an HTML page that
 *   re-hydrates a Fabric canvas from CDN, and screenshots it.
 *
 * Browser launch:
 *   - On Vercel / AWS Lambda → @sparticuz/chromium
 *   - Locally → puppeteer-core with PUPPETEER_EXECUTABLE_PATH pointing at
 *     a system Chrome / Edge install
 */

import type { Browser, Page, HTTPRequest } from "puppeteer-core";
import { composeSvg, type ComposeSpec } from "./svg-template";
import { fitTextFields, type FitField } from "./svg-fit";
import { fontFaceCss } from "./custom-fonts";
import type { CustomFont } from "./types";

// The ONLY external hosts a render page may talk to. Everything renders from a
// data: URI or these — Google Fonts (text) and jsdelivr (the Fabric bundle).
const ALLOWED_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
  "res.cloudinary.com", // our own uploaded fonts / assets
]);

/**
 * Lock a render page to data: URIs and the allowlist above.
 *
 * This is the hard stop for SSRF: the export route renders customer-supplied SVG
 * in a networked headless Chrome, so without this a crafted <foreignObject>/
 * <image href="http://169.254.169.254/…"> could make Chrome fetch internal or
 * cloud-metadata endpoints and return them inside the screenshot. Chrome now
 * physically cannot reach anything off the allowlist.
 */
async function guardPage(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on("request", (req: HTTPRequest) => {
    const url = req.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return req.continue();
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (ALLOWED_HOSTS.has(host)) return req.continue();
    } catch {
      /* unparseable → block */
    }
    req.abort();
  });
}

async function launchBrowser(): Promise<Browser> {
  const isServerless =
    !!process.env.VERCEL ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.NETLIFY;

  if (isServerless) {
    const chromiumMod = await import("@sparticuz/chromium");
    const chromium = chromiumMod.default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = await import("puppeteer-core");
  const exePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!exePath) {
    throw new Error(
      "Local export requires PUPPETEER_EXECUTABLE_PATH (e.g. C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe)"
    );
  }
  return puppeteer.launch({
    headless: true,
    executablePath: exePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

/**
 * Compute a deviceScaleFactor that keeps the final rasterised output
 * under ~15 megapixels. Large print SVGs (e.g. 2500x5000) would
 * otherwise blow past Vercel's 1 GB function memory at the default 3x.
 */
function clampScaleFactor(width: number, height: number, preferred = 3): number {
  const MAX_PIXELS = 15_000_000;
  const area = Math.max(1, width * height);
  const maxScale = Math.sqrt(MAX_PIXELS / area);
  return Math.max(1, Math.min(preferred, maxScale));
}

function googleFontsLinkTag(fonts: string[] | undefined): string {
  if (!fonts || !fonts.length) return "";
  const params = fonts
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`)
    .join("&");
  const href = `https://fonts.googleapis.com/css2?${params}&display=block`;
  return `<link rel="stylesheet" href="${href}">`;
}

/**
 * Template v2 print render.
 *
 * Takes the PREPARED svg (fetched server-side from the stored template, never
 * from the request) plus a spec built out of the stored config, and composes the
 * artwork inside the page before screenshotting it. The browser that the
 * customer used sent values, not artwork — so a tampered DOM can change what
 * they saw on screen but has no path to what gets printed.
 *
 * composeSvg is shipped into the page by source. It is written to be
 * self-contained precisely so this works: the customer's preview and this print
 * run the identical implementation and cannot drift.
 */
export async function renderTemplateV2(
  preparedSvg: string,
  spec: ComposeSpec,
  width: number,
  height: number,
  fonts?: string[],
  customFonts?: CustomFont[]
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await guardPage(page);
    await page.setViewport({
      width: Math.max(1, Math.ceil(width)),
      height: Math.max(1, Math.ceil(height)),
      deviceScaleFactor: clampScaleFactor(width, height),
    });

    // Both font sources, or the print quietly comes out in a fallback face:
    // Google families via <link>, admin-uploaded faces via @font-face.
    const html = `<!doctype html><html><head><meta charset="utf-8">${googleFontsLinkTag(
      fonts
    )}<style>
${fontFaceCss(customFonts)}
html,body{margin:0;padding:0;background:#ffffff;}
svg{display:block;width:${width}px;height:${height}px;}
</style></head><body></body></html>`;
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.evaluate(
      (src: string, svg: string, s: ComposeSpec, w: number, h: number) => {
        const compose = new Function(`return (${src})`)() as (
          a: string,
          b: ComposeSpec
        ) => string;
        document.body.innerHTML = compose(svg, s);
        const el = document.querySelector("svg");
        if (el) {
          el.setAttribute("width", String(w));
          el.setAttribute("height", String(h));
        }
      },
      composeSvg.toString(),
      preparedSvg,
      spec,
      width,
      height
    );

    // Fonts must be forced, not merely awaited. A browser fetches a webfont
    // lazily — only once layout proves something needs it — so document.fonts
    // .ready can resolve while the face has not even begun downloading, and the
    // screenshot lands on the fallback. Printing a customer's design in the
    // wrong typeface is silent and unrecoverable, so ask for each family by name
    // and only then wait.
    const families = [
      ...(fonts ?? []),
      ...(customFonts ?? []).map((f) => f.family),
    ];
    if (families.length) {
      await page.evaluate(async (list: string[]) => {
        const d = document as Document & {
          fonts: {
            ready: Promise<unknown>;
            load: (font: string) => Promise<unknown>;
          };
        };
        await Promise.all(
          list.map((f) => d.fonts.load(`400 64px '${f}'`).catch(() => undefined))
        );
        await d.fonts.ready;
      }, families);
    }

    // Apply the SAME overflow fit the editor applied. This runs after the fonts
    // are loaded, because it measures text — and it must run here rather than be
    // trusted from the browser, or a customer could be shown shrunk-to-fit text
    // and sent an overflowing print file.
    await page.evaluate(
      (src: string, svg: string, f: FitField[]) => {
        const fit = new Function(`return (${src})`)() as (
          a: string,
          b: string,
          c: FitField[]
        ) => void;
        fit("body", svg, f);
      },
      fitTextFields.toString(),
      preparedSvg,
      spec.textFields.map((f) => ({
        nodeId: f.nodeId,
        fontSize: f.fontSize,
        align: f.align,
      }))
    );

    const shot = await page.screenshot({ type: "png", fullPage: false });
    return Buffer.from(shot);
  } finally {
    await browser.close();
  }
}

/**
 * Strip the SVG constructs that turn a server-side render into an SSRF/XSS
 * vector before it is injected into the page. Belt-and-braces with guardPage:
 * the network guard already blocks the fetch, this removes the elements that
 * would attempt it (and any that could execute script). Legitimate template
 * artwork uses none of these.
 */
function sanitizeSvgForRender(svg: string): string {
  return svg
    .replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, "")
    .replace(/<\s*(iframe|object|embed|animate|set|animateTransform)\b[\s\S]*?>/gi, "")
    .replace(/\son\w+\s*=\s*(["'])[\s\S]*?\1/gi, "")
    // external references — only data: URIs survive
    .replace(
      /\b(href|xlink:href|src)\s*=\s*(["'])\s*(?!data:)[^"']*\2/gi,
      ""
    );
}

export async function renderTemplateSVG(
  svgString: string,
  width: number,
  height: number,
  fonts?: string[]
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await guardPage(page);
    await page.setViewport({
      width: Math.max(1, Math.ceil(width)),
      height: Math.max(1, Math.ceil(height)),
      deviceScaleFactor: clampScaleFactor(width, height),
    });
    const fontLink = googleFontsLinkTag(fonts);
    const html = `<!doctype html><html><head><meta charset="utf-8">${fontLink}<style>
html,body{margin:0;padding:0;background:#ffffff;}
svg{display:block;width:${width}px;height:${height}px;}
</style></head><body>${sanitizeSvgForRender(svgString)}</body></html>`;
    await page.setContent(html, { waitUntil: "networkidle0" });
    // Wait until the browser confirms all @font-face downloads finished.
    // Without this Puppeteer can race ahead and screenshot before the
    // Google Font is applied, defeating the whole point.
    if (fonts && fonts.length) {
      await page.evaluate(() =>
        (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready
      );
    }
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      omitBackground: false,
    });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
