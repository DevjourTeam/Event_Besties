import { useState } from 'react'
import { useEditorState, useEditorApi } from '../../editor/EditorProvider'
import ToolSidebar from './ToolSidebar'
import CanvasStage from './CanvasStage'

/**
 * EditorShell — the pixel-matched layout from the reference:
 *   [ tool sidebar ] [ top bar / canvas / bottom bar ]
 * inside the rounded gray stage container.
 */
export default function EditorShell({
  productTitle = 'Create Your Design',
  price,
  onProcess: onProcessProp,
  onSave: onSaveProp,
}) {
  const { doc, thumb, layers } = useEditorState()
  const api = useEditorApi()

  // Full-size preview of the customer's design (data URL), null = closed.
  const [preview, setPreview] = useState(null)
  const hasDesign = layers.length > 0

  const onProcess = async () => {
    // Cap the export edge when a host handler will POST it to the export API.
    const png = await api.canvas.current.exportPNG(onProcessProp ? { maxEdge: 2400 } : {})
    if (onProcessProp) return onProcessProp(png)
    console.log('Process → PNG data URL length:', png?.length)
  }

  const onSave = async () => {
    const png = await api.canvas.current.exportPNG(onSaveProp ? { maxEdge: 2400 } : {})
    if (onSaveProp) return onSaveProp(png)
    console.log('Save Design → PNG data URL length:', png?.length)
  }

  const openPreview = async () => {
    const png = await api.canvas.current.exportPNG({ maxEdge: 1400 })
    if (png) setPreview(png)
  }

  // The bottom-bar thumbnail: the product's own image, falling back to a live
  // render of the design, then to the empty placeholder.
  const thumbSrc = doc.productImage || thumb

  return (
    <div className="ps-editor">
      <div className="ps-stage">
        <ToolSidebar />

        <section className="ps-main">
          {/* top bar */}
          <header className="ps-topbar">
            <span className="ps-topbar__title">{productTitle}</span>
            <span className="ps-topbar__info" title="About this product">
              <i className="nxi nxi-info" aria-hidden="true" />
            </span>
            <div className="ps-topbar__spacer" />
            <button
              type="button"
              className="ps-btn ps-btn--save"
              onClick={openPreview}
              disabled={!hasDesign}
              title={hasDesign ? 'Preview your design' : 'Add something to your design first'}
            >
              <i className="nxi nxi-eye" aria-hidden="true" />
              Preview
            </button>
            <button type="button" className="ps-btn ps-btn--save" onClick={onSave}>
              <i className="nxi nxi-save" aria-hidden="true" />
              Save Design
            </button>
          </header>

          {/* canvas */}
          <CanvasStage />

          {/* bottom bar */}
          <footer className="ps-bottombar">
            <div>
              <button
                type="button"
                className="ps-thumb"
                onClick={hasDesign ? openPreview : undefined}
                title={hasDesign ? 'Preview your design' : doc.name}
              >
                {thumbSrc ? (
                  // No crossOrigin: this is only displayed, never read back into
                  // a canvas, and the flag would break it if the CDN omits CORS.
                  <img className="ps-thumb__img" src={thumbSrc} alt={doc.name} />
                ) : (
                  <span className="ps-thumb__dot" />
                )}
              </button>
              <div className="ps-thumb__label">{doc.name}</div>
            </div>
            <div className="ps-bottombar__spacer" />
            {price != null && <div className="ps-price">{price}</div>}
            <button type="button" className="ps-btn ps-btn--gold" onClick={onProcess}>
              Process
            </button>
          </footer>
        </section>
      </div>

      {/* ---- design preview modal ---- */}
      {preview && (
        <div className="ps-preview" role="dialog" aria-label="Design preview">
          <div className="ps-preview__backdrop" onClick={() => setPreview(null)} />
          <div className="ps-preview__card">
            <div className="ps-preview__head">
              <span className="ps-preview__title">{doc.name} — your design</span>
              <button
                type="button"
                className="ps-preview__close"
                onClick={() => setPreview(null)}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <div className="ps-preview__body">
              <img src={preview} alt="Your design" />
            </div>
            <div className="ps-preview__foot">
              <a
                className="ps-btn ps-btn--outline"
                href={preview}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open full size
              </a>
              <a className="ps-btn ps-btn--outline" href={preview} download={`${doc.name || 'design'}.png`}>
                Download
              </a>
              <div className="ps-bottombar__spacer" />
              <button
                type="button"
                className="ps-btn ps-btn--gold"
                onClick={() => {
                  setPreview(null)
                  onProcess()
                }}
              >
                Looks good — Process
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
