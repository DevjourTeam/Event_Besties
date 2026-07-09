import { useEffect, useState } from 'react'
import { EditorProvider } from './editor/EditorProvider'
import EditorShell from './components/shell/EditorShell'
import { loadDesignDoc } from './editor/loadDesign'
import { preloadAllFonts } from './utils/fontLoader'
import './styles/tokens.css'
import './styles/nxicons.css'
import './styles/shell.css'

/**
 * App — boots the editor on the product loaded from window.__EDITOR_CONFIG__.
 * The shape + real-world size come from the canvas_config Metaobject (or a demo
 * config in dev), so any product loads, not a hardcoded shape.
 */
export default function App() {
  const [boot, setBoot] = useState(null) // { doc, price, productTitle } | null while loading

  useEffect(() => {
    preloadAllFonts()
    let alive = true
    loadDesignDoc().then((r) => { if (alive) setBoot(r) })
    return () => { alive = false }
  }, [])

  if (!boot) {
    return (
      <div className="ps-boot">
        <div className="ps-boot__spinner" />
        <span>Loading designer…</span>
      </div>
    )
  }

  return (
    <EditorProvider initialDoc={boot.doc}>
      <EditorShell productTitle={boot.productTitle || 'Create Your ...'} price={boot.price} />
    </EditorProvider>
  )
}
