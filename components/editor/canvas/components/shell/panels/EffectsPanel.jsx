import { useEffect, useRef, useState } from 'react'
import { useEditorApi } from '../../../editor/EditorProvider'

/**
 * Choose Text Shape — warps the active text via text-on-path.
 *
 * Only shapes that text-on-path can render faithfully are offered, and each one
 * is visually distinct. (The old list had three duplicate pairs: arch/bridge
 * and archDown/valley were the same curve at different offsets, and wave/waveAlt
 * were mirror images. The waves were dropped entirely — they never read as
 * professional signage.)
 *
 * `size` scales the depth of the curve. W is the text's NATURAL width, measured
 * with any existing path detached — otherwise each change compounds on the last.
 */
const EFFECTS = [
  { id: 'plain', label: 'None', build: () => null },
  { id: 'archUp', label: 'Arch', build: (W, s) => `M 0 ${s} Q ${W / 2} ${-s} ${W} ${s}` },
  { id: 'archDown', label: 'Arch down', build: (W, s) => `M 0 ${-s} Q ${W / 2} ${s} ${W} ${-s}` },
  { id: 'slant', label: 'Slant', build: (W, s) => `M 0 ${s} L ${W} ${-s}` },
  {
    id: 'circle',
    label: 'Circle',
    build: (W) => {
      const r = W / (2 * Math.PI) // circumference == text width, so it meets itself
      return `M ${-r} 0 a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`
    },
  },
]

export default function EffectsPanel({ onBack }) {
  const api = useEditorApi()
  const initial = useRef('plain')
  const [sel, setSel] = useState('plain')
  const [size, setSize] = useState(1)
  // the text's un-warped size, captured once so effects never compound
  const base = useRef(null)

  useEffect(() => {
    base.current =
      api.canvas.current.getTextBaseSize?.() ||
      (() => {
        const p = api.canvas.current.getActiveProps()
        return { width: p?.width || 200, height: p?.height || 40 }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = (effect, sizeVal) => {
    const b = base.current || { width: 200, height: 40 }
    const depth = b.height * 0.6 * sizeVal
    api.canvas.current.setTextPath(effect.build(b.width, depth))
  }

  const pick = (effect) => {
    setSel(effect.id)
    apply(effect, size)
  }
  const onSize = (v) => {
    const n = Number(v)
    setSize(n)
    const eff = EFFECTS.find((e) => e.id === sel)
    if (eff && eff.id !== 'plain') apply(eff, n)
  }
  const cancel = () => {
    const eff = EFFECTS.find((e) => e.id === initial.current) || EFFECTS[0]
    apply(eff, size)
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
        <input
          type="range" min="1" max="4" step="0.5"
          value={size}
          disabled={sel === 'plain' || sel === 'circle'}
          onChange={(e) => onSize(e.target.value)}
        />
        <span className="ps-tslider__v">{size}</span>
      </div>

      <div className="ps-effectgrid">
        {EFFECTS.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`ps-effectcell${sel === e.id ? ' is-active' : ''}`}
            onClick={() => pick(e)}
            title={e.label}
          >
            <EffectIcon id={e.id} />
            <span className="ps-effectcell__label">{e.label}</span>
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
    slant: 'M6 22 L42 10',
    circle: 'M24 6 A10 10 0 1 1 23.9 6',
  }
  return (
    <svg viewBox="0 0 48 32" width="100%" height="22" fill="none" stroke="#8c93c4"
      strokeWidth="2.5" strokeLinecap="round">
      <path d={P[id] || P.plain} />
    </svg>
  )
}
