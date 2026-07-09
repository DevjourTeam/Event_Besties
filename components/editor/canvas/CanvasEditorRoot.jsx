'use client'

import { useEffect } from 'react'
import { EditorProvider } from './editor/EditorProvider'
import EditorShell from './components/shell/EditorShell'
import { preloadAllFonts } from './utils/fontLoader'
import './styles/tokens.css'
import './styles/nxicons.css'
import './styles/shell.css'

/**
 * CanvasEditorRoot — the custom "free canvas" designer, mounted inside the
 * Next.js host at /editor/[productId] when the config is a canvas config.
 *
 * This mirrors the standalone editor's App.jsx, except the design `doc`
 * arrives as a prop (built from the Shopify CanvasConfig by the host) instead
 * of being fetched from window.__EDITOR_CONFIG__. Everything else — the shell,
 * Fabric canvas, tools and panels — is the editor we built, unchanged.
 */
export default function CanvasEditorRoot({ doc, productTitle, price }) {
  useEffect(() => {
    preloadAllFonts()
  }, [])

  return (
    <EditorProvider initialDoc={doc}>
      <EditorShell productTitle={productTitle || 'Create Your Design'} price={price} />
    </EditorProvider>
  )
}
