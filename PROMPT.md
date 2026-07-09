# Event Besties — Design Editor Platform
## Claude Code Build Prompt

---

## PROJECT OVERVIEW

Build a single Next.js 14 (App Router) application that serves two distinct frontends from one codebase deployed on Vercel:

- **Admin Dashboard** → `https://event-besties.vercel.app/admin`
- **Customer Design Editor** → `https://event-besties.vercel.app/editor/[templateId]`
- **Shopify Embed Script** → `https://event-besties.vercel.app/embed.js` (injected via `<script>` tag on Shopify product pages)

No separate backend. No external database. All persistent data lives in **Shopify metafields**. Files stored on **Cloudinary**. The app is stateless — reads and writes Shopify and Cloudinary on every operation.

---

## UI DESIGN REFERENCE

The admin and editor UI has been fully prototyped. Follow these specifications exactly — do not invent new UI patterns.

### Design System
- **Background:** `#f0ede5` (warm cream)
- **Sidebar:** `#242018` (very dark warm brown)
- **Sidebar accent:** `#c8a96e` (gold — active nav border)
- **White surface:** `#ffffff` with `1px solid #e5e0d8` border
- **Form surface:** `#f8f5f0`
- **Primary button:** `#1a1a1a` background, white text
- **Gold button:** `#c8a96e` background, white text
- **Border radius:** 8–12px on cards, 8px on inputs/buttons
- **Typography:** System sans-serif for UI, `Georgia, serif` for headings and large numbers
- **All icons:** Stroke-based SVG only — no emoji, no filled icons, no 3D

### Admin Sidebar
- Brand: "Event Besties" in Georgia italic, 22px, `#f5f0e8`
- Subtitle: "ADMIN DASHBOARD" in 10px uppercase tracking, `#6a6050`
- Nav items: 13px, icon + label, left border `#c8a96e` when active
- Footer: connected store URL, email, Sign out button
- Two nav items only: **Templates & Canvases** | **Template Builder**

---

## TECH STACK

```
Framework:        Next.js 14 App Router (TypeScript)
Styling:          Tailwind CSS
Canvas Engine:    Fabric.js 5.3.1 (customer editor only)
File Storage:     Cloudinary (SVG originals + exported PNGs + previews)
Shopify:          Admin API (GraphQL) + Storefront API (GraphQL)
PDF/Export:       Puppeteer + @sparticuz/chromium (serverless PNG export)
Auth (admin):     NextAuth.js v5 with credentials provider
BG Removal:       Customer's own Python API (configurable endpoint in .env)
Deployment:       Vercel
```

---

## ENVIRONMENT VARIABLES

```env
# Shopify
SHOPIFY_STORE_DOMAIN=event-besties-store.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=shpat_xxx
SHOPIFY_STOREFRONT_API_TOKEN=xxx
SHOPIFY_WEBHOOK_SECRET=xxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Admin Auth
NEXTAUTH_SECRET=xxx
ADMIN_EMAIL=test@gmail.com
ADMIN_PASSWORD=hashed_password

# Background Removal
BG_REMOVAL_API_URL=https://your-python-api.com/remove

# App
NEXT_PUBLIC_APP_URL=https://event-besties.vercel.app
```

---

## FILE STRUCTURE

```
/app
  /admin
    layout.tsx                    ← auth guard + sidebar layout
    page.tsx                      ← redirect to /admin/dashboard
    /dashboard
      page.tsx                    ← Templates & Canvases page
    /builder
      page.tsx                    ← Template Builder page (both tabs)
    /login
      page.tsx                    ← admin login form

  /editor
    /[templateId]
      page.tsx                    ← auto-detects mode from config, renders correct editor

  /api
    /admin
      /upload-svg
        route.ts                  ← POST: receive SVG, upload to Cloudinary, return URL
      /save-template
        route.ts                  ← POST: save template config to Shopify product metafield
      /save-canvas
        route.ts                  ← POST: save canvas config to Shopify product metafield
      /templates
        route.ts                  ← GET: fetch all templates from Shopify metafields
    /editor
      /config/[templateId]
        route.ts                  ← GET: fetch template config from Shopify metafield
      /export
        route.ts                  ← POST: receive design JSON, Puppeteer render, upload PNG, return URLs
      /bg-remove
        route.ts                  ← POST: proxy to Python bg removal API
    /webhooks
      /shopify/order-paid
        route.ts                  ← POST: receive paid order, read print file URL, call POD supplier
    /auth
      /[...nextauth]
        route.ts                  ← NextAuth handler

/components
  /admin
    Sidebar.tsx
    StatCard.tsx
    TemplateCard.tsx
    PreviewModal.tsx              ← the detail modal with Copy/Download/Re-upload
    SVGUploader.tsx               ← upload zone + SVG validator
    PermissionEditor.tsx          ← element list with toggle buttons (LOCKED / TEXT / COLOR)
    CanvasConfigurator.tsx        ← rectangle canvas form + live preview
  /editor
    EditorShell.tsx               ← top bar, bottom bar, layout wrapper
    TemplateEditor.tsx            ← Mode 1: SVG DOM editor
    FreeEditor.tsx                ← Mode 2: Fabric.js canvas editor
    TextToolPanel.tsx             ← left panel for text: fonts dropdown, size, color picker
    UploadToolPanel.tsx           ← left panel for image upload
    PropertiesPanel.tsx           ← right panel: transform, layer, undo/redo
    UndoRedoBar.tsx               ← undo/redo buttons + keyboard shortcut bindings
    CanvasOverlay.tsx             ← SVG overlay: bleed (red) + safe zone (green) lines

/lib
  shopify-admin.ts                ← Shopify Admin API GraphQL client
  shopify-storefront.ts           ← Shopify Storefront API GraphQL client
  cloudinary.ts                   ← upload, transform, generate URLs
  svg-parser.ts                   ← parse SVG elements, extract IDs and types
  canvas-export.ts                ← Puppeteer PNG render at 300dpi
  fabric-history.ts               ← undo/redo stack manager for Fabric.js

/public
  embed.js                        ← Shopify embed script (inject Customize button)
```

---

## SHOPIFY DATA MODEL

No database. Everything stored in Shopify metafields.

### Template Config (on Product)
```
Namespace: custom
Key:       template_config
Type:      json
```
```json
{
  "type": "template",
  "templateId": "tpl_xxx",
  "productName": "Happy Birthday Princess",
  "svgUrl": "https://res.cloudinary.com/xxx/raw/upload/templates/tpl_xxx.svg",
  "canvasWidth": 800,
  "canvasHeight": 1010,
  "permissions": {
    "title-text":   { "type": "text",   "label": "Name",    "locked": false },
    "date-text":    { "type": "text",   "label": "Date",    "locked": false },
    "bg-shape":     { "type": "color",  "label": "Background color", "locked": false },
    "logo-group":   { "type": "locked", "label": "Logo",    "locked": true }
  },
  "price": "£29.99",
  "status": "published",
  "createdAt": "2026-04-13"
}
```

### Canvas Config (on Product)
```
Namespace: custom
Key:       canvas_config
Type:      json
```
```json
{
  "type": "canvas",
  "templateId": "cnv_xxx",
  "productName": "Rectangle Canvas Print",
  "shape": "rect",
  "displayW": 380,
  "displayH": 500,
  "printWidthCm": 100,
  "printHeightCm": 150,
  "bleedPx": 10,
  "safePx": 22,
  "price": "£89.99",
  "status": "draft",
  "createdAt": "2026-04-13"
}
```

### Order Design Data (on Order)
```
Namespace: custom
Key:       design_data
Type:      json
```
```json
{
  "templateId": "tpl_xxx",
  "mode": "template",
  "printFileUrl": "https://res.cloudinary.com/xxx/image/upload/print/order_xxx.png",
  "previewUrl": "https://res.cloudinary.com/xxx/image/upload/preview/order_xxx.jpg",
  "customerDesign": { "...fabric.js JSON or SVG patch data..." }
}
```

---

# PHASE 1 — PROJECT FOUNDATION

## 1.1 Setup
- `npx create-next-app@latest event-besties --typescript --tailwind --app`
- Install dependencies:
  ```bash
  npm install fabric@5.3.1
  npm install next-auth@beta
  npm install cloudinary
  npm install @sparticuz/chromium puppeteer-core
  npm install graphql-request
  ```
- Configure `next.config.ts`:
  - Add Cloudinary domain to `images.remotePatterns`
  - Add `serverExternalPackages: ['@sparticuz/chromium']`
- Set up all environment variables in `.env.local`
- Create `tailwind.config.ts` with the custom color palette from the design system

## 1.2 Design Tokens (tailwind.config.ts)
```js
colors: {
  cream: '#f0ede5',
  sidebar: '#242018',
  'sidebar-hover': '#2e2820',
  gold: '#c8a96e',
  'card-border': '#e5e0d8',
  'form-surface': '#f8f5f0',
  'text-muted': '#8a8070',
}
```

## 1.3 Shopify API Client (lib/shopify-admin.ts)
- GraphQL client using native `fetch` with Admin API token in headers
- Functions:
  - `getProductMetafield(productId, namespace, key)` → returns parsed JSON value
  - `setProductMetafield(productId, namespace, key, value)` → upserts metafield
  - `getOrderMetafield(orderId, namespace, key)` → returns parsed JSON value
  - `setOrderMetafield(orderId, namespace, key, value)` → upserts metafield
  - `listProductsWithMetafield(namespace, key)` → returns array of products that have the metafield set

## 1.4 Cloudinary Client (lib/cloudinary.ts)
- `uploadSVG(buffer, publicId)` → uploads raw SVG, returns secure URL
- `uploadPNG(buffer, folder, publicId)` → uploads PNG, returns secure URL
- `uploadJPEG(buffer, folder, publicId)` → uploads JPEG preview, returns secure URL

## 1.5 NextAuth Setup
- Credentials provider only
- Email + password checked against env vars `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- Protect all `/admin` routes via middleware
- Session strategy: JWT

---

# PHASE 2 — ADMIN DASHBOARD (Templates & Canvases Page)

Route: `/admin/dashboard`

## 2.1 Layout (app/admin/layout.tsx)
- Auth guard: redirect to `/admin/login` if no session
- Render `<Sidebar>` component on the left
- Main content area on the right, `overflow-y: auto`

## 2.2 Sidebar Component
Exact match to design prototype:
- "Event Besties" — Georgia italic, 22px, `#f5f0e8`
- "ADMIN DASHBOARD" — 10px uppercase spaced, `#6a6050`
- Divider
- Nav: **Templates & Canvases** (grid icon), **Template Builder** (pen/edit icon)
- Active state: `border-left: 3px solid #c8a96e`, background `rgba(255,255,255,0.07)`
- Footer: store URL from env, email from env, Sign Out button

## 2.3 Dashboard Page (app/admin/dashboard/page.tsx)
- Server component
- Fetches templates on load: calls `listProductsWithMetafield('custom', 'template_config')` and `listProductsWithMetafield('custom', 'canvas_config')`
- Passes data to client component for interactivity

## 2.4 Page Header
- H1: "Templates & Canvases" — Georgia, 34px
- Subtitle: "Manage your premade templates and custom canvas designs" — 13px muted
- Buttons: "+ New Template" (outline) → navigates to `/admin/builder?tab=svg` | "+ New Canvas" (filled black) → `/admin/builder?tab=canvas`

## 2.5 Stats Grid (2×2)
- **Total Templates** — count of template type metafields
- **Custom Canvases** — count of canvas type metafields
- **Uploaded** — count of items with published status
- **Last Updated** — most recent `createdAt` value across all items
- Each stat: 42px Georgia serif number, 10px uppercase label

## 2.6 Tabs — Premade Templates | Custom Canvases
- Client-side tab switch, no page reload
- Underline active indicator

## 2.7 Toolbar
- Search input with magnifier icon — filters cards by name client-side
- Filter dropdown: All | Published | Draft

## 2.8 Template Cards Grid (3 columns)
Each card:
- **Top half:** 180px image area. If SVG URL exists, render `<img src={svgUrl}>`. If not, render gradient background with initials (first letter of each word, max 3, large Georgia serif).
- **Body:** product name (truncated), type badge (amber = Template, blue = Canvas), status badge (green = Published, gray = Draft)
- **Footer:** Single **Preview** button with eye icon. No Edit, no Delete.

## 2.9 Preview Modal (PreviewModal.tsx)
Opens when Preview button clicked. Matches screenshot reference exactly.

Layout — split modal, 880px wide, 82vh tall:
- **Close X** — top right, absolute positioned
- **Left panel (42% width):** white/cream background. Shows actual SVG render if available, else gradient initials box. Product name in large Georgia caps below. Horizontal dividing line.
- **Right panel (58% width):** scrollable. Contains:
  - Product name as large title (Georgia, 22px, uppercase, letter-spacing)
  - **CANVAS SIZE** label + `800 × 1010 px` value
  - **ELEMENTS** label + count value
  - **EDITABLE FIELDS** label + comma-separated field names
  - **CATEGORY** label + value
  - **STATUS** label + green pill `● Published`
  - **CREATED** label + date
  - **TEMPLATE JSON** label + dark code block (`#1a1814` bg, `#a8c488` monospace text, 160px max-height scrollable)
- **Footer bar:** three buttons — `Copy JSON` (outline), `Download JSON` (outline, actually triggers file download), `Re-upload` (dark filled, navigates to builder with this template loaded)

---

# PHASE 3 — ADMIN TEMPLATE BUILDER (SVG Tab)

Route: `/admin/builder?tab=svg`

## 3.1 Page Layout
- Same sidebar
- Header: "Template Builder" + back arrow button
- Two tabs: `1 SVG Template — Upload & Permissions` | `2 Canvas Config — Free Design Editor`
- Tab 1 active when `?tab=svg`, Tab 2 active when `?tab=canvas`

## 3.2 Split Layout
- Left column: 340px fixed, white background, scrollable
- Right column: flex-1, cream background, scrollable

## 3.3 Left Column — Upload Zone
- Dashed border upload zone with cloud-upload icon
- "Click to upload SVG" title, "Export from Illustrator with named layers" subtitle
- `<input type="file" accept=".svg">`
- On file select: read as text, trigger validation + parsing

## 3.4 Left Column — SVG Validator
Appears immediately after upload. Runs these checks:
- ✅ Valid SVG structure (DOMParser, check for `parsererror`)
- ✅ or ⚠️ Named elements count (`[id]` selector, warn if 0)
- ✅ File size in KB
- ✅ Text elements count
Display as a card with green checkmarks, amber warnings, red errors.

## 3.5 Left Column — Permission Editor (THE CRITICAL SECTION)

### Rules — read carefully:
- Parse the uploaded SVG using DOMParser
- Find ALL elements that have an `id` attribute (exclude `<svg>`, `<defs>`, `<metadata>`, `<style>` tags)
- For each element, render a row in the permission list
- **Default state for every single element: LOCKED**
- Admin uses a toggle/button to unlock — not a select dropdown, use clear toggle buttons:
  - `LOCKED` button (gray, active by default)
  - `TEXT` button (blue, only shown if element is `<text>` or `<tspan>`)
  - `COLOR` button (purple, only shown if element has a `fill` attribute)
- Only one permission active at a time per element
- Locking means: customer CANNOT interact with this element at all
- TEXT means: customer can replace the text string only — NO font change, NO size change, NO position change, NO color change
- COLOR means: customer can change the fill color only — NO position change, NO shape change, NO other change

Each row shows:
- Element tag badge (blue = text, purple = shape)
- `#elementId` in monospace
- Current text content preview (first 24 chars, if text element)
- Toggle buttons: LOCKED | TEXT (if applicable) | COLOR (if applicable)

## 3.6 Left Column — Save Form
Appears after permissions are set:
- Input: Template name
- Input: Price (e.g. £29.99)
- Input: Shopify Product ID (paste from Shopify admin URL)
- Gold button: "Save & Publish to Shopify"

On save:
1. `POST /api/admin/upload-svg` → uploads SVG to Cloudinary → returns `svgUrl`
2. Build config JSON with `type: "template"`, `svgUrl`, permissions map
3. `POST /api/admin/save-template` → calls Shopify Admin API to write config JSON to `custom.template_config` metafield on the product

## 3.7 Right Column — SVG Preview
- Renders the uploaded SVG as raw HTML inside a preview container
- Max width 100%, max height 380px
- Shows the actual design as the customer will see it

## 3.8 Right Column — Permission JSON
- Dark code block showing the current permissions object, auto-updates as admin clicks toggles
- "Copy JSON" button
- "Preview in Editor" button → opens `/editor/[templateId]` in new tab

---

# PHASE 4 — ADMIN CANVAS CONFIGURATOR (Canvas Tab)

Route: `/admin/builder?tab=canvas`

## 4.1 Split Layout
- Left: 360px form panel, white background, scrollable
- Right: preview + JSON output

## 4.2 Form — Product Info Card
- Product name input
- Price input
- Shopify Product ID input

## 4.3 Form — Print Dimensions Card
- Width (cm) — number input
- Height (cm) — number input
- Bleed (px) — number input (red outer line)
- Safe zone (px) — number input (green inner line)

**RECTANGLE ONLY — no shape selector, no arch, no circle.**

## 4.4 Form — Editor Display Size Card
- Display W (px) — the pixel width of the canvas in the customer editor
- Display H (px) — the pixel height of the canvas in the customer editor
- Helper text: "These are display pixels. Print output is always high-res regardless."

## 4.5 Live Preview (Canvas 2D API — no Fabric.js needed here)
- `<canvas>` element sized at 55% of display dimensions
- Draw white rectangle fill for the printable area
- SVG overlay on top: red bleed line (rectangle), green safe zone line (rectangle, inner)
- Updates on every input change in real time

## 4.6 Config JSON Display
- Dark code block showing full config JSON
- "Copy JSON" button
- "Preview in Editor" button → encodes config as `btoa(JSON.stringify(cfg))` and opens `/editor?config=[encoded]`

## 4.7 Save & Publish
- Gold button "Save & Publish to Shopify"
- Validates Shopify Product ID is present
- `POST /api/admin/save-canvas` → writes config to `custom.canvas_config` metafield

---

# PHASE 5 — EDITOR SHELL & MODE DETECTION

Route: `/editor/[templateId]`

## 5.1 Config Loading
On page load:
```typescript
// 1. Try URL param first (used by admin preview button)
const paramConfig = searchParams.get('config')
if (paramConfig) config = JSON.parse(atob(paramConfig))

// 2. Otherwise fetch from API
else config = await fetch(`/api/editor/config/${templateId}`).then(r => r.json())

// 3. Detect mode
if (config.type === 'template') renderTemplateEditor(config)
if (config.type === 'canvas')   renderFreeEditor(config)
```

## 5.2 Editor Shell Layout
Fixed full-viewport layout, no scroll on body:
```
┌─────────────────────────────────────┐
│ TOP BAR (52px)                      │
├─────────┬───────────────┬───────────┤
│ LEFT    │  CANVAS AREA  │  RIGHT    │
│ PANEL   │  (flex: 1)    │  PANEL    │
│ (260px) │               │  (210px)  │
│         │               │ hidden    │
│         │               │ until sel │
├─────────┴───────────────┴───────────┤
│ BOTTOM BAR (70px)                   │
└─────────────────────────────────────┘
```

## 5.3 Top Bar
- Left: "Create Your Design" — 17px semibold
- Center: step indicator — `● Create Your Design  ——  ○ Printing`
- Right: empty (same width as left for centering)

## 5.4 Bottom Bar
- Product thumbnail (small arch/rect icon with amber dot)
- Product name below thumbnail
- Spacer
- Price (20px bold Georgia)
- "Process" button (gold background `#c8a96e`, white text, 14px bold)

---

# PHASE 6 — TEMPLATE EDITOR (Mode 1)

Activated when `config.type === 'template'`

## 6.1 SVG Loading
1. Fetch SVG raw text from `config.svgUrl` via `fetch()`
2. Parse with DOMParser
3. Inject SVG element directly into the preview container as innerHTML
4. SVG renders exactly as designed — no transformation, no scaling beyond `max-width: 100%`
5. All elements are non-interactive by default (pointer-events: none on SVG)

## 6.2 Left Panel — Editable Fields Only
No tools. No upload. No text button.

For each element in `config.permissions` where `locked === false`:
- Render an input field with the label from the permission config
- If `type === "text"`: render `<input type="text">` pre-filled with the element's current `textContent`
- If `type === "color"`: render a color picker row (color swatch + hex input)
- Nothing else

## 6.3 Live SVG Patching

### Text Fields
```typescript
inputElement.addEventListener('input', (e) => {
  const svgElement = svgContainer.querySelector(`#${elementId}`)
  if (!svgElement) return
  svgElement.textContent = e.target.value
  // DO NOT change: font, size, position, rotation, color
  // ONLY change: textContent
})
```

### Color Pickers
```typescript
colorPicker.addEventListener('input', (e) => {
  const svgElement = svgContainer.querySelector(`#${elementId}`)
  if (!svgElement) return
  svgElement.setAttribute('fill', e.target.value)
  // DO NOT change: position, size, shape, font, text
  // ONLY change: fill attribute
})
```

### Critical rules for SVG patching:
- Never call `setAttribute` on anything except `fill` for color fields
- Never call `setProperty` on styles for any reason
- Never modify `transform`, `x`, `y`, `font-family`, `font-size`, `letter-spacing`
- `textContent` replacement only for text fields
- The SVG's visual layout must remain pixel-perfect at all times

## 6.4 No Right Panel in Template Mode
Template mode has no selection, no transform controls, no layer panel. The right panel is hidden entirely.

## 6.5 Process Button in Template Mode
- Serialize the patched SVG: `new XMLSerializer().serializeToString(svgElement)`
- `POST /api/editor/export` with `{ type: 'template', svgString, templateId }`
- Server renders PNG at 300dpi, uploads to Cloudinary, returns `{ printUrl, previewUrl }`
- Add to Shopify cart with line item properties

---

# PHASE 7 — FREE CANVAS EDITOR (Mode 2)

Activated when `config.type === 'canvas'`

## 7.1 Fabric.js Canvas Init
```typescript
const canvas = new fabric.Canvas('c', {
  width: config.displayW,
  height: config.displayH,
  backgroundColor: '#ffffff',
  preserveObjectStacking: true
})
```

## 7.2 Bleed/Safe Zone Overlay
- SVG element positioned absolute on top of the canvas, `pointer-events: none`
- Red rectangle (bleed): `config.bleedPx` inset from canvas edges
- Green rectangle (safe zone): `config.safePx` inset from canvas edges
- Both drawn as `<rect>` with `fill="none"`, `stroke="..."`, `stroke-width="1.4"`
- Overlay always renders above all design content, never part of the export

## 7.3 Left Panel — TWO TOOLS ONLY

### Tool 1: Upload Design
- Card with upload icon + "Upload design" + "Browse or import"
- Clicking opens `<input type="file" accept="image/*">`
- On file select:
  1. FileReader reads as data URL
  2. `fabric.Image.fromURL(dataUrl, img => { ... })`
  3. Scale image to fit within 76% of canvas dimensions
  4. Center on canvas
  5. Set `cornerColor: '#c8a96e'`, `borderColor: '#c8a96e'`, `cornerStyle: 'circle'`, `cornerSize: 9`, `transparentCorners: false`
  6. Mark with `img._isUserImage = true`
  7. Add to canvas, set as active object
  8. Push to undo history

### Tool 2: Add Text
- Card with text icon + "Add Text" + "Add your text here"
- Clicking toggles a sub-panel below the card

#### Text Sub-Panel Contents:

**Text styles (3 buttons):**
- Heading — 36px bold
- Subheading — 22px semibold
- Body text — 15px normal

**Fonts Dropdown (full dropdown, NOT small buttons):**
A `<select>` element styled as a proper dropdown showing font name in that font. Include these fonts loaded via Google Fonts (`@import` in CSS):
```
Arial (system)
Georgia (system)
Times New Roman (system)
Courier New (system)
Playfair Display
Merriweather
Lora
EB Garamond
Libre Baskerville
Raleway
Montserrat
Poppins
Nunito
Lato
Open Sans
Oswald
Bebas Neue
Dancing Script
Pacifico
Sacramento
Great Vibes
Lobster
Satisfy
Abril Fatface
Cinzel
Cormorant Garamond
Josefin Sans
Quicksand
Righteous
Permanent Marker
```
Load Google Fonts via: `https://fonts.googleapis.com/css2?family=Playfair+Display&family=Merriweather&...&display=swap`

When font is changed, if there is an active text object, update its `fontFamily` property immediately.

**Font Size:**
- Number input, min 8 max 300, default 32
- `+` and `-` buttons on each side
- Updates active text object `fontSize` in real time

**Bold / Italic toggles:**
- Two small toggle buttons B and I
- Toggle `fontWeight: 'bold' / 'normal'` and `fontStyle: 'italic' / 'normal'`

**Color Picker:**
- 8 preset color swatches (round circles)
- A native `<input type="color">` for custom color
- Updates `fill` property of active text object

#### On "Heading/Subheading/Body" button click:
```typescript
const textObj = new fabric.IText(sampleText, {
  left: canvas.width / 2 - 80,
  top: canvas.height / 2 - 20,
  fontSize: size,
  fontWeight: weight,
  fill: currentTextColor,
  fontFamily: currentFont,
  cornerColor: '#c8a96e',
  borderColor: '#c8a96e',
  cornerStyle: 'circle',
  cornerSize: 9,
  transparentCorners: false,
  editingBorderColor: '#c8a96e'
})
canvas.add(textObj)
canvas.setActiveObject(textObj)
canvas.renderAll()
pushHistory()
```

## 7.4 Right Properties Panel
Appears when any object is selected. Hidden when nothing selected.

**Transform card:**
- W input (updates `scaleX = value / object.width`)
- H input (updates `scaleY = value / object.height`)
- Angle input (updates `angle`)
- Opacity: label + percentage display + range slider

**Text card (visible only when text object selected):**
- Font size number input
- Bold / Italic toggles

**Layer card (always visible when object selected):**
- Bring Forward button (up arrow icon)
- Send Backward button (down arrow icon)
- Duplicate button (copy icon)
- Delete button (trash icon, red on hover)

All transform inputs update live on `oninput`. After any change, push to undo history.

## 7.5 Undo / Redo System

### Implementation (lib/fabric-history.ts):
```typescript
class FabricHistory {
  private stack: string[] = []    // JSON snapshots
  private pointer: number = -1    // current position
  private maxSize: number = 30    // max history states
  private canvas: fabric.Canvas
  private isPaused: boolean = false

  push() {
    if (this.isPaused) return
    // Remove any redo states ahead of current pointer
    this.stack = this.stack.slice(0, this.pointer + 1)
    // Add current state
    this.stack.push(JSON.stringify(this.canvas.toJSON(['_isUserImage'])))
    if (this.stack.length > this.maxSize) this.stack.shift()
    else this.pointer++
  }

  undo() {
    if (this.pointer <= 0) return
    this.pointer--
    this.isPaused = true
    this.canvas.loadFromJSON(JSON.parse(this.stack[this.pointer]), () => {
      this.canvas.renderAll()
      this.isPaused = false
    })
  }

  redo() {
    if (this.pointer >= this.stack.length - 1) return
    this.pointer++
    this.isPaused = true
    this.canvas.loadFromJSON(JSON.parse(this.stack[this.pointer]), () => {
      this.canvas.renderAll()
      this.isPaused = false
    })
  }

  canUndo() { return this.pointer > 0 }
  canRedo() { return this.pointer < this.stack.length - 1 }
}
```

### Push history after every:
- Image added
- Text added
- Object deleted
- Object moved (on `object:modified`)
- Object scaled (on `object:modified`)
- Object rotated (on `object:modified`)
- Text content changed (on `text:changed`)
- Font changed
- Color changed

### Undo/Redo buttons in top bar of editor:
- Undo button (curved arrow left icon) — disabled and grayed when `!canUndo()`
- Redo button (curved arrow right icon) — disabled and grayed when `!canRedo()`

### Keyboard shortcuts:
```typescript
document.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement?.tagName
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    history.undo()
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
    e.preventDefault()
    history.redo()
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const obj = canvas.getActiveObject()
    if (obj && obj.selectable !== false) {
      canvas.remove(obj)
      canvas.renderAll()
      history.push()
    }
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault()
    // duplicate active object
  }
  if (e.key === 'Escape') {
    canvas.discardActiveObject()
    canvas.renderAll()
  }
})
```

---

# PHASE 8 — EXPORT ENGINE

Route: `POST /api/editor/export`

## 8.1 Request Body
```typescript
{
  type: 'template' | 'canvas',
  templateId: string,
  // for template mode:
  svgString?: string,
  // for canvas mode:
  fabricJSON?: object,
  displayW?: number,
  displayH?: number,
  printWidthCm?: number,
  printHeightCm?: number
}
```

## 8.2 Template Mode Export
1. Receive the patched SVG string
2. Wrap in full HTML page with white background
3. Launch Puppeteer with `@sparticuz/chromium`
4. Set viewport to `canvasWidth × canvasHeight` at `deviceScaleFactor: 3` (3× = ~300dpi equivalent)
5. Screenshot as PNG
6. Upload to Cloudinary under `/print/` folder
7. Generate JPEG preview at 800px width, upload to `/preview/` folder
8. Return `{ printUrl, previewUrl }`

## 8.3 Canvas Mode Export
1. Receive `fabricJSON`, `displayW`, `displayH`
2. Build HTML page that initializes Fabric.js canvas from JSON at display dimensions
3. Launch Puppeteer, set viewport at `displayW × displayH`, `deviceScaleFactor: 3`
4. Wait for canvas to render (`await page.waitForFunction(...)`)
5. Screenshot canvas element only
6. Upload print PNG and preview JPEG to Cloudinary
7. Return `{ printUrl, previewUrl }`

## 8.4 Background Removal Proxy (api/editor/bg-remove)
```typescript
// POST /api/editor/bg-remove
// Body: { imageDataUrl: string }
// Proxies to process.env.BG_REMOVAL_API_URL (customer's Python API)
// Returns: { resultDataUrl: string }
```

---

# PHASE 9 — SHOPIFY CART INTEGRATION

## 9.1 Add to Cart Flow
After successful export, call Shopify Storefront API:

```graphql
mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart {
      id
      checkoutUrl
    }
  }
}
```

Line item attributes:
```typescript
attributes: [
  { key: '_print_file_url', value: printUrl },
  { key: '_preview_url',    value: previewUrl },
  { key: '_template_id',    value: templateId },
  { key: '_design_type',    value: config.type },
  { key: 'Customization',   value: buildSummary(config, customerInputs) }
]
```

## 9.2 Cart ID Management
- On first add: call `cartCreate` mutation, store `cartId` in `localStorage`
- On subsequent adds: use stored `cartId`
- After add to cart: redirect to `cart.checkoutUrl`

---

# PHASE 10 — SHOPIFY EMBED SCRIPT

File: `/public/embed.js`

This script is added to Shopify theme via `<script src="https://event-besties.vercel.app/embed.js"></script>` in the theme's `product.liquid` template.

```javascript
(function() {
  // 1. Find the product ID from Shopify's global liquid object
  const productId = window.ShopifyAnalytics?.meta?.product?.id
  if (!productId) return

  // 2. Fetch the metafield config for this product
  fetch(`https://event-besties.vercel.app/api/editor/config/${productId}`)
    .then(r => r.json())
    .then(config => {
      if (!config || !config.type) return

      // 3. Find the Add to Cart button and hide it
      const addToCartBtn = document.querySelector('[name="add"]') ||
                           document.querySelector('.product-form__submit')
      if (addToCartBtn) addToCartBtn.style.display = 'none'

      // 4. Inject "Customize & Order" button
      const btn = document.createElement('button')
      btn.textContent = 'Customize & Order'
      btn.style.cssText = `
        display: block; width: 100%; padding: 14px 24px;
        background: #c8a96e; color: #fff; border: none;
        border-radius: 8px; font-size: 15px; font-weight: 700;
        cursor: pointer; letter-spacing: 0.02em;
        transition: background 0.15s;
      `
      btn.addEventListener('mouseenter', () => btn.style.background = '#b8996e')
      btn.addEventListener('mouseleave', () => btn.style.background = '#c8a96e')

      // 5. On click: open editor in modal iframe or new page
      btn.addEventListener('click', () => {
        const variantId = document.querySelector('[name="id"]')?.value || ''
        const editorUrl = `https://event-besties.vercel.app/editor/${productId}?variantId=${variantId}`

        // Open as full-screen modal overlay
        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed; inset: 0; z-index: 99999;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
        `
        const iframe = document.createElement('iframe')
        iframe.src = editorUrl
        iframe.style.cssText = `
          width: 95vw; height: 90vh;
          border: none; border-radius: 12px;
          background: #fff;
        `
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) document.body.removeChild(overlay)
        })
        // Listen for add-to-cart message from iframe
        window.addEventListener('message', (e) => {
          if (e.data?.type === 'DESIGN_ADDED_TO_CART') {
            document.body.removeChild(overlay)
            window.location.href = e.data.checkoutUrl
          }
        })
        overlay.appendChild(iframe)
        document.body.appendChild(overlay)
      })

      // Insert button after add-to-cart area
      if (addToCartBtn) {
        addToCartBtn.parentNode.insertBefore(btn, addToCartBtn.nextSibling)
      } else {
        document.querySelector('.product-form')?.appendChild(btn)
      }
    })
    .catch(() => {}) // Fail silently — don't break Shopify page
})()
```

## 10.1 Post-Message from Editor to Shopify
In the editor, after successful add to cart:
```typescript
if (window.parent !== window) {
  window.parent.postMessage({
    type: 'DESIGN_ADDED_TO_CART',
    checkoutUrl: cart.checkoutUrl
  }, '*')
} else {
  window.location.href = cart.checkoutUrl
}
```

---

# PHASE 11 — WEBHOOK & FULFILLMENT

Route: `POST /api/webhooks/shopify/order-paid`

## 11.1 Webhook Handler
```typescript
// 1. Verify HMAC signature
const hmac = req.headers['x-shopify-hmac-sha256']
const body = await req.text()
const verified = verifyShopifyWebhook(body, hmac, process.env.SHOPIFY_WEBHOOK_SECRET)
if (!verified) return Response.json({ error: 'Unauthorized' }, { status: 401 })

// 2. Parse order
const order = JSON.parse(body)

// 3. For each line item that has _print_file_url attribute
for (const lineItem of order.line_items) {
  const attrs = lineItem.properties || []
  const printUrl = attrs.find(a => a.name === '_print_file_url')?.value
  const templateId = attrs.find(a => a.name === '_template_id')?.value
  if (!printUrl) continue

  // 4. Save design data to order metafield
  await setOrderMetafield(order.id, 'custom', 'design_data', {
    templateId,
    printFileUrl: printUrl,
    previewUrl: attrs.find(a => a.name === '_preview_url')?.value,
    orderId: order.id,
    fulfilledAt: null
  })

  // 5. TODO: Call POD supplier API (Printful/Printify) with printUrl
  // await callPODSupplier({ printUrl, sku: lineItem.sku, shippingAddress: order.shipping_address })
}
```

---

# PHASE 12 — ADDITIONAL REQUIREMENTS

## 12.1 Error Handling
- All API routes return proper HTTP status codes
- Client-side: show toast notifications for errors (same toast system as prototypes — black bg, white text, slides up from bottom)
- SVG upload: validate file is actually SVG before processing
- Export: if Puppeteer fails, return 500 with clear error message

## 12.2 Loading States
- Canvas export: show spinner overlay on canvas with "Generating high-res file..." message
- SVG upload: show loading state while Cloudinary upload runs
- Save template: show loading state on button

## 12.3 Responsive
- Admin dashboard: minimum 1200px width, no mobile layout needed
- Customer editor: minimum 768px, optimized for desktop/tablet
- Editor on mobile: show "This editor works best on desktop" message below 768px

## 12.4 Toast System
Used throughout both admin and editor:
- Fixed position, `bottom: 24px`, `left: 50%`, `transform: translateX(-50%)`
- Black background `#1a1a1a`, white text, `border-radius: 8px`, `padding: 9px 20px`
- Animate in: `translateY(0) opacity(1)`, animate out: `translateY(8px) opacity(0)`
- Auto-dismiss after 3000ms

## 12.5 Admin Login Page (`/admin/login`)
- Centered card, white bg, rounded, shadow
- "Event Besties" Georgia italic logo at top
- Email input, password input
- "Sign In" button gold color
- Error message display if credentials wrong
- On success: redirect to `/admin/dashboard`

---

# BUILD ORDER

Build in this exact sequence so each phase is testable before moving on:

1. **Foundation** — Next.js setup, env vars, Tailwind tokens, Shopify client, Cloudinary client
2. **Admin login** — auth working end to end
3. **Sidebar + layout** — shell working, navigation between pages
4. **Dashboard page** — stats, tabs, cards grid (with mock data first)
5. **Preview modal** — fully working with mock data
6. **SVG upload + validator** — file reading and element parsing
7. **Permission editor** — toggle buttons, JSON output updating live
8. **Save template** — Cloudinary upload + Shopify metafield write
9. **Canvas configurator** — form + live preview + save
10. **API: fetch config** — reading metafields, returning to editor
11. **Editor shell** — layout, top bar, bottom bar, mode detection
12. **Template editor (Mode 1)** — SVG loading, field binding, live patching
13. **Free canvas editor (Mode 2)** — Fabric.js init, upload tool, text tool with fonts
14. **Undo/Redo** — history stack, buttons, keyboard shortcuts
15. **Properties panel** — transform, layer controls
16. **Export API** — Puppeteer PNG generation
17. **Cart integration** — Storefront API, add to cart, redirect
18. **Embed script** — `embed.js`, modal iframe, postMessage
19. **Webhook handler** — order paid, design data save
20. **End-to-end test** — full flow from admin publish to customer order

---

# IMPORTANT CONSTRAINTS

1. **No database** — Shopify metafields are the only persistent storage
2. **Fabric.js version 5.3.1 only** — do not use v6, API is different
3. **SVG template patching is additive only** — only `textContent` for text fields, only `fill` attribute for color fields. Never touch position, transform, font-family, font-size, or any other attribute
4. **All locked SVG elements** — must have `pointer-events: none` so customer cannot accidentally interact with them
5. **Overlay lines (bleed/safe)** — must never appear in the exported PNG. They exist only in the preview overlay SVG element, which is not part of the Fabric.js canvas
6. **Admin icons** — stroke-based SVG only throughout, no emoji, no filled icons
7. **Google Fonts** — load in editor only (not admin), use `font-display: swap`
8. **Embed script** — must fail silently and never break the Shopify product page

