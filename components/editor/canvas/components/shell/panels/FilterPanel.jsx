import { useRef, useState } from 'react'
import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'

// id must match buildPreset() in CanvasStage; css is just the thumbnail preview.
const PRESETS = [
  { id: 'original', css: 'none' },
  { id: 'sepia', css: 'sepia(0.8)' },
  { id: 'bright', css: 'brightness(1.25)' },
  { id: 'pink', css: 'sepia(0.5) saturate(2) hue-rotate(300deg)' },
  { id: 'blue', css: 'sepia(0.5) saturate(3) hue-rotate(190deg)' },
  { id: 'cool', css: 'saturate(1.5) hue-rotate(40deg)' },
  { id: 'vintage', css: 'sepia(0.6) contrast(1.1)' },
  { id: 'green', css: 'sepia(0.6) saturate(2.5) hue-rotate(70deg)' },
  { id: 'bw', css: 'grayscale(1) contrast(1.3)' },
]

export default function FilterPanel({ onBack }) {
  const { selection } = useEditorState()
  const api = useEditorApi()
  const initial = useRef(api.canvas.current.getPreset())
  const [sel, setSel] = useState(initial.current)
  const base = selection.origSrc || selection.src // clean original for accurate previews

  const pick = (id) => { setSel(id); api.canvas.current.setFilterPreset(id) }
  const done = () => { api.canvas.current.commitAdjustments(); onBack() }
  const cancel = () => { api.canvas.current.setFilterPreset(initial.current); onBack() }

  return (
    <div className="ps-panel ps-filter">
      <button type="button" className="ps-panel__back" onClick={cancel}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Filter image
      </button>

      <div className="ps-filtergrid">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ps-filtercell ps-checker${sel === p.id ? ' is-active' : ''}`}
            onClick={() => pick(p.id)}
          >
            {base && <img src={base} alt="" style={{ filter: p.css }} draggable={false} />}
          </button>
        ))}
      </div>

      <div className="ps-adjust__btns">
        <button type="button" className="ps-btn ps-btn--dark" onClick={cancel}>Cancel</button>
        <button type="button" className="ps-btn ps-btn--gold" onClick={done}>Done</button>
      </div>
    </div>
  )
}
