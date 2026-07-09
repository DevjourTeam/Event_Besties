import { useRef, useState } from 'react'
import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'

const SLIDERS = [
  { key: 'brightness', label: 'Brightness' },
  { key: 'contrast', label: 'Contrast' },
  { key: 'saturation', label: 'Saturation' },
  { key: 'hue', label: 'Hue' },
  { key: 'blur', label: 'Blur' },
]

const ZERO = { brightness: 0, contrast: 0, saturation: 0, hue: 0, blur: 0 }

export default function ImageAdjustPanel({ onBack }) {
  const { selection } = useEditorState()
  const api = useEditorApi()
  // snapshot the values we started with so Cancel can revert
  const initial = useRef({ ...ZERO, ...api.canvas.current.getAdjust() })
  const [vals, setVals] = useState(initial.current)

  const set = (key, value) => {
    const v = { ...vals, [key]: Number(value) }
    setVals(v)
    api.canvas.current.applyAdjustments(v)
  }

  const done = () => {
    api.canvas.current.commitAdjustments()
    onBack()
  }
  const cancel = () => {
    api.canvas.current.applyAdjustments(initial.current)
    onBack()
  }

  return (
    <div className="ps-panel ps-adjust">
      <button type="button" className="ps-panel__back" onClick={cancel}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Edit image
      </button>

      <div className="ps-adjust__preview ps-checker">
        {selection.src && <img src={selection.src} alt="" draggable={false} />}
      </div>
      <button type="button" className="ps-adjust__crop">
        <i className="nxi nxi-gallery" aria-hidden="true" /> Crop
      </button>

      {SLIDERS.map((s) => (
        <div className="ps-slider" key={s.key}>
          <div className="ps-slider__top">
            <label>{s.label}</label>
          </div>
          <div className="ps-slider__row">
            <input
              type="range"
              min={s.key === 'blur' ? 0 : -100}
              max="100"
              value={vals[s.key]}
              onChange={(e) => set(s.key, e.target.value)}
            />
            <input
              className="ps-slider__num"
              value={vals[s.key]}
              onChange={(e) => set(s.key, e.target.value || 0)}
            />
          </div>
        </div>
      ))}

      <div className="ps-adjust__btns">
        <button type="button" className="ps-btn ps-btn--dark" onClick={cancel}>Cancel</button>
        <button type="button" className="ps-btn ps-btn--gold" onClick={done}>Done</button>
      </div>
    </div>
  )
}
