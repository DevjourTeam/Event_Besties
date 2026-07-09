import { getConfig } from '../config/editorConfig'
import { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } from '../config/shopifyConfig'

/**
 * loadDesignDoc — turns the page's __EDITOR_CONFIG__ into the editor `doc`
 * (shape + real-world cm size + mockup) so ANY product loads, not a hardcoded
 * shape.
 *
 *   product page  →  window.__EDITOR_CONFIG__ = { designId, variantId, ... }
 *                 →  fetch canvas_config Metaobject (Storefront API)
 *                 →  pick the chosen size variant
 *                 →  { doc, price, productTitle }
 *
 * In dev / without Shopify it falls back to demo configs (and supports
 * ?design=<key>&variant=<id> for quick testing of different shapes).
 */

const HEART =
  'M50 88 C12 60 8 30 28 18 C40 11 50 22 50 31 C50 22 60 11 72 18 C92 30 88 60 50 88 Z'

// Demo products used in dev or when no real Metaobject is available.
const DEMOS = {
  arch: {
    name: 'Create Your Own Arched Sailboard',
    mockup: null,
    defaultVariant: '7ft',
    variants: [
      { id: '5ft', label: '5FT', price: '£69.99', shapeType: 'arch', w: 74, h: 150 },
      { id: '6ft', label: '6FT', price: '£89.99', shapeType: 'arch', w: 90, h: 180 },
      { id: '7ft', label: '7FT', price: '£109.99', shapeType: 'arch', w: 105, h: 210 },
    ],
  },
  circle: {
    name: 'Create Your Own Circle Sign',
    defaultVariant: '3ft',
    variants: [
      { id: '2ft', label: '2FT / 60cm', price: '£49.99', shapeType: 'circle', w: 60, h: 60 },
      { id: '3ft', label: '3FT / 90cm', price: '£79.99', shapeType: 'circle', w: 90, h: 90 },
      { id: '5ft', label: '5FT / 150cm', price: '£129.99', shapeType: 'circle', w: 150, h: 150 },
    ],
  },
  rect: {
    name: 'Create Your Own Rectangle Backdrop',
    defaultVariant: 'm',
    variants: [
      { id: 's', label: 'Welcome 60×45', price: '£44.99', shapeType: 'rect', w: 60, h: 45 },
      { id: 'm', label: '74×56', price: '£59.99', shapeType: 'rect', w: 74, h: 56 },
      { id: 'l', label: '100×74', price: '£74.99', shapeType: 'rect', w: 100, h: 74 },
    ],
  },
  cutout: {
    name: 'Create Your Own Cutout',
    defaultVariant: '2ft',
    variants: [
      { id: '2ft', label: '2FT / 60cm', price: '£59.99', shapeType: 'custom', svgPath: HEART, w: 60, h: 64 },
      { id: '3ft', label: '3FT / 90cm', price: '£89.99', shapeType: 'custom', svgPath: HEART, w: 90, h: 96 },
    ],
  },
}

const METAOBJECT_QUERY = `
  query GetCanvasConfig($id: ID!) {
    metaobject(id: $id) {
      id
      type
      fields { key value }
    }
  }`

async function storefrontFetch(query, variables) {
  const res = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

// Normalise a real canvas_config Metaobject (admin dashboard schema: variants_json)
async function fetchMetaobjectConfig(id) {
  const data = await storefrontFetch(METAOBJECT_QUERY, { id })
  const fields = Object.fromEntries((data.metaobject?.fields || []).map((f) => [f.key, f.value]))
  const raw = fields.variants_json ? JSON.parse(fields.variants_json) : []
  const variants = raw.map((v) => ({
    id: v.id,
    label: v.label,
    price: v.price,
    shapeType: v.svgPath ? 'custom' : 'rect',
    svgPath: v.svgPath || null,
    w: Number(v.canvasWidth) || 100,
    h: Number(v.canvasHeight) || 100,
    backgroundColor: v.backgroundColor || null,
  }))
  return {
    name: fields.name || 'Custom Product',
    mockup: fields.mockup_url || null,
    defaultVariant: variants[0]?.id,
    variants,
  }
}

async function resolveConfig(designKey) {
  if (!designKey || String(designKey).startsWith('test')) return DEMOS.arch
  if (DEMOS[designKey]) return DEMOS[designKey]
  return fetchMetaobjectConfig(designKey)
}

export async function loadDesignDoc() {
  const cfg = getConfig()
  const params = new URLSearchParams(window.location.search)
  const designKey = params.get('design') || cfg.designId
  const variantKey = params.get('variant') || cfg.variantId

  let config
  try {
    config = await resolveConfig(designKey)
  } catch (err) {
    console.warn('[editor] config load failed, using demo:', err?.message)
    config = DEMOS.arch
  }

  const variant =
    config.variants.find((v) => v.id === variantKey) ||
    config.variants.find((v) => v.id === config.defaultVariant) ||
    config.variants[0]

  const doc = {
    id: designKey,
    name: config.name,
    shape: { type: variant.shapeType || 'rect', svgPath: variant.svgPath || null },
    sizeCm: { w: variant.w, h: variant.h },
    dpi: 150,
    background: variant.backgroundColor
      ? { type: 'color', value: variant.backgroundColor }
      : { type: 'none', value: null },
    mockup: config.mockup || null,
  }

  return {
    doc,
    price: variant.price || '',
    productTitle: cfg.productTitle || config.name,
    variantLabel: variant.label || '',
  }
}
