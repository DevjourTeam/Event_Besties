'use client'

import { useEffect, useState, useCallback } from 'react'
import { EditorProvider } from './editor/EditorProvider'
import EditorShell from './components/shell/EditorShell'
import { preloadAllFonts } from './utils/fontLoader'
import { handoffDesign } from '@/lib/cart-client'
import './styles/tokens.css'
import './styles/nxicons.css'
import './styles/shell.css'
import './styles/embed.css'

/**
 * CanvasEditorRoot — the custom "free canvas" designer, mounted inside the
 * Next.js host at /editor/[productId] when the config is a canvas config.
 *
 * The design `doc` arrives as a prop (built from the Shopify CanvasConfig).
 * Save / Process render the design to a print PNG on the client and hand it to
 * the host's export API (Cloudinary) + cart hand-off. Everything else — the
 * shell, Fabric canvas, tools and panels — is the editor we built, unchanged.
 */
export default function CanvasEditorRoot({ doc, productTitle, price, templateId, variantId }) {
  useEffect(() => {
    preloadAllFonts()
  }, [])

  // { kind: 'processing' | 'success' | 'error', msg }
  const [status, setStatus] = useState(null)

  const finalize = useCallback(
    async (pngBase64, { addToCart }) => {
      setStatus({ kind: 'processing', msg: 'Preparing your print file…' })
      try {
        const res = await fetch('/api/editor/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'canvas', templateId, pngBase64 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Export failed')

        if (!addToCart) {
          setStatus({ kind: 'success', msg: 'Design saved. Your print file is ready.' })
          return
        }
        if (!variantId) {
          // No product variant (admin preview / direct visit) — nothing to add to.
          setStatus({
            kind: 'success',
            msg: 'Print file ready. Open this from a product page to add it to your cart.',
          })
          return
        }
        // In a Shopify iframe this posts to the parent; standalone it hits the
        // Storefront cart API and navigates to /cart.
        await handoffDesign({
          variantId,
          printUrl: data.printUrl,
          previewUrl: data.previewUrl,
          templateId,
          designType: 'canvas',
        })
        setStatus({ kind: 'success', msg: 'Added to cart — taking you there…' })
      } catch (e) {
        setStatus({ kind: 'error', msg: e?.message || 'Something went wrong. Please try again.' })
      }
    },
    [templateId, variantId]
  )

  return (
    <div className="ps-embed-page">
      <EditorProvider initialDoc={doc}>
        <EditorShell
          productTitle={productTitle || 'Create Your Design'}
          price={price}
          onProcess={(png) => finalize(png, { addToCart: true })}
          onSave={(png) => finalize(png, { addToCart: false })}
        />
      </EditorProvider>

      {status && (
        <div className="ps-processing" role="status" aria-live="polite">
          <div className="ps-processing__card">
            {status.kind === 'processing' && <div className="ps-processing__spin" />}
            {status.kind === 'success' && <div className="ps-processing__icon ps-processing__icon--ok">✓</div>}
            {status.kind === 'error' && <div className="ps-processing__icon ps-processing__icon--err">!</div>}
            <p className="ps-processing__msg">{status.msg}</p>
            {status.kind !== 'processing' && (
              <button type="button" className="ps-btn ps-btn--outline" onClick={() => setStatus(null)}>
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
