import { useRef, useState } from 'react'
import { useEditorApi } from '../../../editor/EditorProvider'

/**
 * Choose Text Shape — applies a curve/warp to the active text via text-on-path.
 * Each effect builds an SVG path sized to the text width; `size` scales the depth.
 * (Arc/curve family is implemented; mesh-warp shapes can extend this list.)
 */
const EFFECTS = [
  { id: 'plain', build: () => null },
  { id: 'archUp', build: (W, s) => `M 0 ${s} Q ${W / 2} ${-s} ${W} ${s}` },
  { id: 'archDown', build: (W, s) => `M 0 ${-s} Q ${W / 2} ${s} ${W} ${-s}` },
  { id: 'bridge', build: (W, s) => `M 0 ${-s} Q ${W / 2} ${-s * 2} ${W} ${-s}` },
  { id: 'valley', build: (W, s) => `M 0 ${s} Q ${W / 2} ${s * 2} ${W} ${s}` },
  { id: 'wave', build: (W, s) => `M 0 0 C ${W * 0.25} ${-s * 1.6} ${W * 0.25} ${s * 1.6} ${W * 0.5} 0 S ${W * 0.75} ${-s * 1.6} ${W} 0` },
  { id: 'waveAlt', build: (W, s) => `M 0 0 C ${W * 0.25} ${s * 1.6} ${W * 0.25} ${-s * 1.6} ${W * 0.5} 0 S ${W * 0.75} ${s * 1.6} ${W} 0` },
  { id: 'slantUp', build: (W, s) => `M 0 ${s} L ${W} ${-s}` },
  { id: 'slantDown', build: (W, s) => `M 0 ${-s} L ${W} ${s}` },
  { id: 'circle', build: (W) => { const r = W / (2 * Math.PI); return `M ${-r} 0 a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0` } },
]

export default function EffectsPanel({ onBack }) {
  const api = useEditorApi()
  const initial = useRef('plain')
  const [sel, setSel] = useState('plain')
  const [size, setSize] = useState(1)

  const apply = (effect, sizeVal) => {
    const props = api.canvas.current.getActiveProps()
    const W = props?.width || 200
    const depth = (props?.height || 40) * 0.6 * sizeVal
    const path = effect.build(W, depth)
    api.canvas.current.setTextPath(path)
  }

  const pick = (effect) => { setSel(effect.id); apply(effect, size) }
  const onSize = (v) => {
    setSize(Number(v))
    const eff = EFFECTS.find((e) => e.id === sel)
    if (eff && eff.id !== 'plain') apply(eff, Number(v))
  }
  const cancel = () => {
    const eff = EFFECTS.find((e) => e.id === initial.current)
    apply(eff || EFFECTS[0], size)
    onBack()
  }

  return (
    <div className="ps-panel ps-effects">
      <button type="button" className="ps-panel__back" onClick={cancel}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Choose Text Shape
      </button>

      <div className="ps-tslider">
        <label>Effect size</label>
        <input type="range" min="1" max="4" step="0.5" value={size} onChange={(e) => onSize(e.target.value)} />
        <span className="ps-tslider__v">{size}</span>
      </div>

      <div className="ps-effectgrid">
        {EFFECTS.map((e) => (
          <button key={e.id} type="button" className={`ps-effectcell${sel === e.id ? ' is-active' : ''}`} onClick={() => pick(e)}>
            <EffectIcon id={e.id} />
          </button>
        ))}
      </div>

      <div className="ps-adjust__btns">
        <button type="button" className="ps-btn ps-btn--dark" onClick={cancel}>Cancel</button>
        <button type="button" className="ps-btn ps-btn--gold" onClick={onBack}>Done</button>
      </div>
    </div>
  )
}

// tiny preview glyph of each curve
function EffectIcon({ id }) {
  const P = {
    plain: 'M6 16 H42',
    archUp: 'M6 22 Q24 6 42 22',
    archDown: 'M6 10 Q24 26 42 10',
    bridge: 'M6 20 Q24 8 42 20',
    valley: 'M6 12 Q24 24 42 12',
    wave: 'M6 16 C15 6 15 26 24 16 S33 6 42 16',
    waveAlt: 'M6 16 C15 26 15 6 24 16 S33 26 42 16',
    slantUp: 'M6 22 L42 10',
    slantDown: 'M6 10 L42 22',
    circle: 'M24 6 A10 10 0 1 1 23.9 6',
  }
  return (
    <svg viewBox="0 0 48 32" width="100%" height="100%" fill="none" stroke="#8c93c4" strokeWidth="2.5" strokeLinecap="round">
      <path d={P[id] || P.plain} />
    </svg>
  )
}
