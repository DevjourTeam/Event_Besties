import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'

/**
 * Background colour of the printable surface.
 *
 * This drives doc.background, NOT canvas.backgroundColor — the Fabric canvas is
 * bigger than the print area and transparent, so a colour set on it would paint
 * the workspace too. doc.background fills the shape on screen (the DOM surface
 * layer) and is baked into the export by renderPrint().
 */
const SWATCHES = [
  '#ffffff', '#f6f6f8', '#e9e9ed', '#1b2333',
  '#a98b52', '#f3eddf', '#e6469b', '#ffd1e8',
  '#e0563b', '#ffb4a2', '#2a7a3c', '#c9e2cf',
  '#2a5b94', '#cbdcef', '#5b3a8a', '#e5d4f5',
]

export default function BackgroundsPanel({ onBack }) {
  const { doc } = useEditorState()
  const api = useEditorApi()

  const current = doc.background?.type === 'color' ? doc.background.value : null
  const setBg = (value) =>
    api.patchDoc({ background: value ? { type: 'color', value } : { type: 'none', value: null } })

  return (
    <div className="ps-panel ps-bgpanel">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Backgrounds
      </button>

      <div className="ps-bggrid">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className={`ps-bgcell${current === c ? ' is-active' : ''}`}
            style={{ background: c }}
            onClick={() => setBg(c)}
            title={c}
            aria-label={`Background ${c}`}
          />
        ))}
      </div>

      <label className="ps-bgcustom">
        <span>Custom colour</span>
        <input
          type="color"
          value={current || '#ffffff'}
          onChange={(e) => setBg(e.target.value)}
        />
      </label>

      <button type="button" className="ps-btn ps-btn--outline ps-bgclear" onClick={() => setBg(null)}>
        No background (transparent)
      </button>
    </div>
  )
}
