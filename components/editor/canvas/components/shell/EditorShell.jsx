import { useEditorState, useEditorApi } from '../../editor/EditorProvider'
import ToolSidebar from './ToolSidebar'
import CanvasStage from './CanvasStage'

/**
 * EditorShell — the pixel-matched layout from the reference:
 *   [ tool sidebar ] [ top bar / canvas / bottom bar ]
 * inside the rounded gray stage container.
 */
export default function EditorShell({ productTitle = 'Create Your Design', price }) {
  const { doc } = useEditorState()
  const api = useEditorApi()

  const onProcess = async () => {
    const png = await api.canvas.current.exportPNG()
    // Phase 0: hand the print-res PNG back; real PNG+PDF upload wires in later.
    console.log('Process → PNG data URL length:', png?.length)
  }

  const onSave = async () => {
    const png = await api.canvas.current.save()
    console.log('Save Design → PNG data URL length:', png?.length)
  }

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
            <button type="button" className="ps-btn ps-btn--outline">
              Change product
            </button>
            <span className="ps-topbar__tab">Printing</span>
            <div className="ps-topbar__spacer" />
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
              <div className="ps-thumb">
                <span className="ps-thumb__dot" />
              </div>
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
    </div>
  )
}
