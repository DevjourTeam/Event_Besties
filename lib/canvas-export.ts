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

import type { Browser } from "puppeteer-core";

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

export async function renderTemplateSVG(
  svgString: string,
  width: number,
  height: number,
  fonts?: string[]
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: Math.max(1, Math.ceil(width)),
      height: Math.max(1, Math.ceil(height)),
      deviceScaleFactor: clampScaleFactor(width, height),
    });
    const fontLink = googleFontsLinkTag(fonts);
    const html = `<!doctype html><html><head><meta charset="utf-8">${fontLink}<style>
html,body{margin:0;padding:0;background:#ffffff;}
svg{display:block;width:${width}px;height:${height}px;}
</style></head><body>${svgString}</body></html>`;
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

export async function renderFabricJSON(
  fabricJSON: unknown,
  width: number,
  height: number
): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: Math.max(1, Math.ceil(width)),
      height: Math.max(1, Math.ceil(height)),
      deviceScaleFactor: clampScaleFactor(width, height),
    });

    const json = JSON.stringify(fabricJSON);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#ffffff;}
canvas{display:block;}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js"></script>
</head><body>
<canvas id="c" width="${width}" height="${height}"></canvas>
<script>
window.__rendered = false;
window.__rendererror = null;
try {
  const c = new fabric.Canvas('c', {
    width: ${width},
    height: ${height},
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: false
  });
  c.loadFromJSON(${json}, function () {
    c.renderAll();
    window.__rendered = true;
  });
} catch (e) {
  window.__rendererror = String(e && e.message || e);
}
</script>
</body></html>`;

    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.waitForFunction(
      "window.__rendered === true || window.__rendererror !== null",
      { timeout: 20000 }
    );
    const error = await page.evaluate(
      () => (window as unknown as { __rendererror: string | null }).__rendererror
    );
    if (error) throw new Error(`Fabric render error: ${error}`);

    const handle = await page.$("canvas#c");
    if (!handle) throw new Error("Canvas element not found in render page");
    const screenshot = await handle.screenshot({
      type: "png",
      omitBackground: false,
    });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
