# Event Besties — Design Editor Platform

A single Next.js 15 (App Router) app that serves three things from one codebase:

- **Admin dashboard** — `/admin` — Google sign-in, browse / build templates and canvases
- **Customer editor** — `/editor/[productId]` — auto-detects template (SVG DOM patcher) or free canvas (Fabric.js) mode
- **Shopify embed script** — `/embed.js` — drop a `<script>` into a Shopify product page to inject a "Customize & Order" button

No database. All persistent data is stored in **Shopify metafields**. Files live on **Cloudinary**. Print-ready exports are rendered server-side with **Puppeteer + @sparticuz/chromium**.

## Stack

- Next.js 15.1.6, React 19, TypeScript, Tailwind CSS v3
- NextAuth v5 (Google OAuth, allowlist by email)
- Fabric.js 5.3.0 (canvas editor; dynamically imported)
- Puppeteer Core + @sparticuz/chromium (export)
- Cloudinary (file storage)
- Shopify Admin + Storefront APIs

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000 — the root redirects to `/admin`.

### Environment variables

See `.env.example`. Required for full operation:

| Var | Used for |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | API base URL |
| `SHOPIFY_ADMIN_API_TOKEN` | Admin API + Storefront API (per project decision a single custom-app token is used for both) |
| `SHOPIFY_WEBHOOK_SECRET` | HMAC verification on `/api/webhooks/shopify/order-paid` |
| `CLOUDINARY_*` | SVG / PNG / JPEG uploads |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated allowlist of admin Gmail addresses |
| `BG_REMOVAL_API_URL` | Customer's Python background removal service |
| `PUPPETEER_EXECUTABLE_PATH` | Local-dev only — points at a system Chrome / Edge install |

On Vercel, `@sparticuz/chromium` is auto-loaded for export — no `PUPPETEER_EXECUTABLE_PATH` needed.

## Routes

| Route | What |
|---|---|
| `/admin/login` | Google sign-in |
| `/admin/dashboard` | Templates & canvases grid + preview modal |
| `/admin/builder?tab=svg` | SVG upload + permission editor |
| `/admin/builder?tab=canvas` | Free canvas configurator |
| `/editor/[productId]` | Customer editor — auto-detects mode |
| `/editor/preview?config=...` | Admin preview button target |
| `/api/admin/upload-svg` | POST — Cloudinary upload (auth) |
| `/api/admin/save-template` | POST — write template_config metafield (auth) |
| `/api/admin/save-canvas` | POST — write canvas_config metafield (auth) |
| `/api/editor/config/[templateId]` | GET — public, used by editor + embed.js |
| `/api/editor/export` | POST — Puppeteer render → Cloudinary |
| `/api/editor/bg-remove` | POST — proxy to Python BG removal |
| `/api/cart/add` | POST — Shopify Storefront cartCreate / cartLinesAdd |
| `/api/webhooks/shopify/order-paid` | POST — HMAC-verified, writes design_data to order metafield |

## Architecture notes

- **No DB** — all template/canvas configs live in Shopify product metafields under `custom.template_config` / `custom.canvas_config`. Order design data lives in `custom.design_data` on the order.
- **SVG patching is additive only** — the template editor only mutates `textContent` for text fields and `setAttribute('fill', …)` for color fields. Position / transform / font / size are untouched so the original layout stays pixel-perfect.
- **Bleed and safe overlays** are SVG layers above the Fabric canvas; they're never part of the export.
- **Cart hand-off** posts a `DESIGN_ADDED_TO_CART` message to the parent window when the editor runs inside an iframe (Shopify embed); otherwise it navigates the top window.

## Build

```bash
npm run build
```

Production build emits one Next 15 app with the editor route bundle around 115 kB (Fabric.js is dynamically imported and stays out of the initial JS).
