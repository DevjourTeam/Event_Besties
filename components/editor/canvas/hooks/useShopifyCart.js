import { getConfig } from '../config/editorConfig'

export async function addToCart(designId, thumbnailUrl, printFileUrl) {
  const variantId = getConfig().variantId

  if (!variantId) {
    throw new Error('No product variant found. Please refresh the page and try again.')
  }

  if (window.location.hostname === 'localhost') {
    console.log('Dev mode: skipping cart add')
    console.log('Would add to cart:', { variantId, designId, thumbnailUrl, printFileUrl })
    return { mock: true }
  }

  const response = await fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: variantId,
      quantity: 1,
      properties: {
        'Design ID': designId,
        'Design Preview': thumbnailUrl,
        '_print_file': printFileUrl,
        '_source_design_id': getConfig().designId,
        '_design_type': getConfig().designType || 'custom'
      }
    })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.description || 'Failed to add to cart')
  }

  return response.json()
}