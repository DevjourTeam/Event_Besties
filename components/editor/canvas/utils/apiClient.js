export function getProxyBase() {
  if (typeof window === 'undefined') return ''
  if (window.location.hostname === 'localhost') return 'http://localhost:3000'
  return window.location.origin
}

export async function callShopifyProxy(action, data) {
  const response = await fetch(getProxyBase() + '/api/shopify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data })
  })
  const json = await response.json()
  if (!response.ok || json.error) {
    throw new Error(json.error || 'Proxy request failed')
  }
  return json
}
