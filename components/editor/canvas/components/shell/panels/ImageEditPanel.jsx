import { useEffect, useState } from 'react'
import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'

/**
 * Left panel shown while a single image is selected.
 * Preview + Crop/Edit + colour options + Apply Filters + Art Size.
 */
export default function ImageEditPanel({ onEdit, onCrop, onFilter }) {
  const { selection } = useEditorState()
  const api = useEditorApi()

  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const [lock, setLock] = useState(true)
  const colorBase = selection.origSrc || selection.src // clean original for colour previews

  // keep Art Size inputs in sync with the live selection
  useEffect(() => {
    setW(selection.wCm ? selection.wCm.toFixed(2) : '')
    setH(selection.hCm ? selection.hCm.toFixed(2) : '')
  }, [selection.wCm, selection.hCm])

  const commitSize = () => {
    const nw = parseFloat(w)
    const nh = parseFloat(h)
    if (!nw || !nh) return
    api.canvas.current.resizeSelectedCm(nw, nh, lock)
  }

  const onW = (val) => {
    setW(val)
    if (lock && selection.wCm) {
      const ratio = selection.hCm / selection.wCm
      setH((parseFloat(val) * ratio || 0).toFixed(2))
    }
  }

  return (
    <div className="ps-panel ps-imgedit">
      <button
        type="button"
        className="ps-panel__back"
        onClick={() => { api.canvas.current.deselect(); api.setTool(null) }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* preview */}
      <div className="ps-imgedit__preview">
        <div className="ps-imgedit__thumb ps-checker">
          {selection.src && <img src={selection.src} alt="" draggable={false} />}
        </div>
        <div className="ps-imgedit__actions">
          <button type="button" className="ps-imgedit__act" onClick={onCrop}>
            <i className="nxi nxi-gallery" aria-hidden="true" /> Crop
          </button>
          <button type="button" className="ps-imgedit__act" onClick={onEdit}>
            <i className="nxi nxi-template-edit" aria-hidden="true" /> Edit
          </button>
        </div>
      </div>

      {/* change color options */}
      <h3 className="ps-imgedit__h">Change color options</h3>
      <div className="ps-colormodes">
        <button type="button" className="ps-colormode" onClick={() => api.canvas.current.setColorMode('bw')}>
          <span className="ps-colormode__thumb ps-checker">
            {colorBase && <img src={colorBase} alt="" style={{ filter: 'grayscale(1) contrast(3)' }} />}
          </span>
          <span>B&amp;W</span>
        </button>
        <button type="button" className="ps-colormode" onClick={() => api.canvas.current.setColorMode('grayscale')}>
          <span className="ps-colormode__thumb ps-checker">
            {colorBase && <img src={colorBase} alt="" style={{ filter: 'grayscale(1)' }} />}
          </span>
          <span>Grayscale</span>
        </button>
      </div>

      {/* apply filters */}
      <button type="button" className="ps-rowlink" onClick={onFilter}>
        <span>Apply Filters</span>
        <span className="ps-rowlink__r">Select Filter ›</span>
      </button>

      {/* art size */}
      <h3 className="ps-imgedit__h">Art Size</h3>
      <div className="ps-artsize">
        <input className="ps-input" value={w} onChange={(e) => onW(e.target.value)} onBlur={commitSize} inputMode="decimal" />
        <button
          type="button"
          className={`ps-artsize__lock${lock ? ' is-on' : ''}`}
          title={lock ? 'Aspect locked' : 'Aspect unlocked'}
          onClick={() => setLock((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            {lock
              ? <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              : <path d="M8 11V8a4 4 0 0 1 7.5-2" />}
          </svg>
        </button>
        <input className="ps-input" value={h} onChange={(e) => setH(e.target.value)} onBlur={commitSize} inputMode="decimal" />
      </div>

      <div className="ps-note">
        <i className="nxi nxi-info" aria-hidden="true" />
        Please check before checkout, your image size exceeds.
      </div>
    </div>
  )
}
