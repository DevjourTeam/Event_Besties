// In the Next.js host these come from NEXT_PUBLIC_* env vars (inlined at build).
// When unset, the clipart catalog fetch simply returns [] and the panel falls
// back to its built-in set — so the editor still works with no Shopify config.
export const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE || ''
export const SHOPIFY_STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_STOREFRONT_TOKEN || ''
