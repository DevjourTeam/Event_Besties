import { useEffect, useState } from 'react'
import { useEditorApi, useEditorState } from '../../../editor/EditorProvider'
import ColorPanel from './ColorPanel'

/**
 * Shown while a shape is selected. Art Size + Art Colors (fill) + Border color,
 * plus a Hollow toggle (outline-only). Colours reuse the shared ColorPanel.
 */
export default function ShapeEditPanel() {
  const { selection } = useEditorState()
  const api = useEditorApi()
  const selId = selection.ids[0]

  const [view, setView] = useState('main') // 'main' | 'fillColor' | 'borderColor'
  const [w, setW] = useState('')
  const [h, setH] = useState('')
  const [lock, setLock] = useState(true)
  const [fill, setFill] = useState('#1b2333')
  const [border, setBorder] = useState('#1b2333')
  const [borderW, setBorderW] = useState(0)
  const [hollow, setHollow] = useState(false)

  // adopt the selected shape's current props
  useEffect(() => {
    if (selection.kind !== 'shape') return
    const p = api.canvas.current.getActiveProps()
    if (!p) return
    const isHollow = p.fill === 'transparent' || p.fill === ''
    setHollow(isHollow)
    if (typeof p.fill === 'string' && !isHollow) setFill(p.fill)
    if (typeof p.stroke === 'string') setBorder(isHollow ? '#1b2333' : p.stroke)
    setBorderW(p.strokeWidth || 0)
  }, [selId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setW(selection.wCm ? selection.wCm.toFixed(2) : '')
    setH(selection.hCm ? selection.hCm.toFixed(2) : '')
  }, [selection.wCm, selection.hCm])

  // compute + apply fill/stroke from the current state (hollow = outline only)
  const apply = (over = {}) => {
    const s = { fill, border, borderW, hollow, ...over }
    const props = s.hollow
      ? { fill: 'transparent', stroke: s.fill, strokeWidth: Math.max(s.borderW, 4) }
      : { fill: s.fill, stroke: s.border, strokeWidth: s.borderW }
    api.canvas.current.patchActive(props)
    api.canvas.current.commit()
  }

  const onFill = (c) => { setFill(c); setHollow(false); apply({ fill: c, hollow: false }) }
  const onBorder = (c) => {
    const bw = borderW || 4
    setBorder(c); setBorderW(bw)
    apply({ border: c, borderW: bw })
  }
  const onHollow = (v) => { setHollow(v); apply({ hollow: v }) }

  const commitSize = () => {
    const nw = parseFloat(w), nh = parseFloat(h)
    if (!nw || !nh) return
    api.canvas.current.resizeSelectedCm(nw, nh, lock)
  }
  const onW = (val) => {
    setW(val)
    if (lock && selection.wCm) setH(((parseFloat(val) * selection.hCm) / selection.wCm || 0).toFixed(2))
  }

  if (view === 'fillColor') {
    return (
      <ColorPanel
        value={fill}
        onChange={onFill}
        onPattern={(url) => { setHollow(false); api.canvas.current.setPatternFill(url) }}
        onBack={() => setView('main')}
      />
    )
  }
  if (view === 'borderColor') {
    return <ColorPanel value={border} onChange={onBorder} onBack={() => setView('main')} />
  }

  return (
    <div className="ps-panel ps-shapeedit">
      <button type="button" className="ps-panel__back"
        onClick={() => { api.canvas.current.deselect(); api.setTool(null) }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <div className="ps-shaperow">
        <span className="ps-shaperow__l">Art Size</span>
        <div className="ps-artsize ps-artsize--inline">
          <input className="ps-input" value={w} onChange={(e) => onW(e.target.value)} onBlur={commitSize} inputMode="decimal" />
          <button type="button" className={`ps-artsize__lock${lock ? ' is-on' : ''}`} onClick={() => setLock((v) => !v)}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              {lock ? <path d="M8 11V8a4 4 0 0 1 8 0v3" /> : <path d="M8 11V8a4 4 0 0 1 7.5-2" />}
            </svg>
          </button>
          <input className="ps-input" value={h} onChange={(e) => setH(e.target.value)} onBlur={commitSize} inputMode="decimal" />
          <span className="ps-borderw__u">cm</span>
        </div>
      </div>

      <button type="button" className="ps-trow" onClick={() => setView('fillColor')}>
        <span className="ps-trow__l">Art Colors</span>
        <span className="ps-trow__r"><span className="ps-swatch" style={{ background: hollow ? '#fff' : fill }} /> ›</span>
      </button>

      <button type="button" className="ps-trow" onClick={() => setView('borderColor')}>
        <span className="ps-trow__l">Border color</span>
        <span className="ps-trow__r"><span className="ps-swatch" style={{ background: border }} /> ›</span>
      </button>

      <label className="ps-toggle">
        <span className="ps-toggle__l">Hollow</span>
        <span className="ps-toggle__sw">
          <input type="checkbox" checked={hollow} onChange={(e) => onHollow(e.target.checked)} />
          <span className="ps-toggle__track" />
        </span>
      </label>
    </div>
  )
}
