import { SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_TOKEN } from '../config/shopifyConfig'

/**
 * Loads the store's OWN clipart catalog (clipart Metaobjects) via the Storefront
 * API, grouped by category. Returns [] if not configured / none exist — the
 * panel then falls back to the built-in set.
 */
let cache = null

export async function fetchClipartCatalog() {
  if (cache) return cache
  if (!SHOPIFY_STORE_DOMAIN || !SHOPIFY_STOREFRONT_TOKEN) return []
  try {
    const query = `{
      metaobjects(type: "clipart", first: 250) {
        edges { node { id fields { key value } } }
      }
    }`
    const res = await fetch(`https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query }),
    })
    const json = await res.json()
    const nodes = json.data?.metaobjects?.edges?.map((e) => e.node) || []
    const items = nodes
      .map((n) => {
        const f = {}
        n.fields.forEach((x) => { f[x.key] = x.value })
        return { id: n.id, name: f.name || '', category: f.category || 'Other', src: f.image_url, sort: Number(f.sort_order) || 0 }
      })
      .filter((c) => c.src)

    const map = {}
    items.forEach((c) => { (map[c.category] ||= []).push(c) })
    cache = Object.entries(map)
      .map(([category, list]) => ({ category, items: list.sort((a, b) => a.sort - b.sort) }))
      .sort((a, b) => a.category.localeCompare(b.category))
    return cache
  } catch {
    return []
  }
}
