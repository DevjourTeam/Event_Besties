const DEV_DEFAULTS = {
  designId: 'test-123',
  designType: 'canvas',
  variantId: null,
  productTitle: 'Test Product'
}

export function getConfig() {
  const raw = window.__EDITOR_CONFIG__
  if (!raw) return DEV_DEFAULTS

  return {
    designId: raw.designId ?? DEV_DEFAULTS.designId,
    designType: raw.designType ?? DEV_DEFAULTS.designType,
    variantId: raw.variantId ?? null,
    productTitle: raw.productTitle ?? DEV_DEFAULTS.productTitle
  }
}
