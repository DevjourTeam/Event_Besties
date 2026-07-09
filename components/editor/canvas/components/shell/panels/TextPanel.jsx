import { useEffect, useRef, useState } from 'react'
import { useEditorApi, useEditorState } from '../../../editor/EditorProvider'
import { loadFont } from '../../../utils/fontLoader'
import FontPanel from './FontPanel'
import EffectsPanel from './EffectsPanel'
import ColorPanel from './ColorPanel'

// decorative display faces used for the "Graphic Fonts" tab
const GRAPHIC_FONTS = [
  'Bungee', 'Monoton', 'Bangers', 'Luckiest Guy', 'Creepster', 'Nosifer',
  'Frijole', 'Shrikhand', 'Alfa Slab One', 'Titan One', 'Lilita One', 'Fredoka One',
  'Ultra', 'Wallpoet', 'Russo One', 'Staatliches',
]

const stack = (t, vertical) => (vertical ? Array.from(t).join('\n') : t)

export default function TextPanel() {
  const api = useEditorApi()
  const { selection } = useEditorState()
  const idRef = useRef(null)

  const [view, setView] = useState('main') // 'main' | 'font' | 'effects' | 'fillColor' | 'strokeColor'
  const [created, setCreated] = useState(false)
  const [text, setText] = useState('')
  const [vertical, setVertical] = useState(false)
  const [align, setAlign] = useState('center')
  const [tab, setTab] = useState('simple')
  const [fontName, setFontName] = useState('Jost')
  const [fontSize, setFontSize] = useState(40)
  const [spacing, setSpacing] = useState(0)
  const [fill, setFill] = useState('#ee3a3a')
  const [stroke, setStroke] = useState('#000000')
  const [strokeW, setStrokeW] = useState(0)

  // preload the decorative faces so the Graphic Fonts previews render correctly
  useEffect(() => { GRAPHIC_FONTS.forEach(loadFont) }, [])

  // When an EXISTING text element is focused on the canvas, adopt it: load its
  // current properties into the panel so re-selecting reopens its editor.
  const selId = selection.ids[0]
  useEffect(() => {
    if (selection.kind !== 'text' || !selId || selId === idRef.current) return
    idRef.current = selId
    const p = api.canvas.current.getActiveProps()
    if (!p) return
    setText(typeof p.text === 'string' ? p.text.replace(/\n/g, '') : '')
    setFontName(p.fontFamily || 'Jost')
    setFontSize(Math.round(p.fontSize) || 40)
    setSpacing(Math.round((p.charSpacing || 0) / 10))
    setFill(typeof p.fill === 'string' ? p.fill : '#ee3a3a')
    setStroke(typeof p.stroke === 'string' ? p.stroke : '#000000')
    setStrokeW(p.strokeWidth || 0)
    setVertical(false)
    setCreated(true)
  }, [selection.kind, selId]) // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (props) => {
    if (!idRef.current) return
    api.canvas.current.setActiveById(idRef.current)
    api.canvas.current.patchActive(props)
  }
  const commit = () => api.canvas.current.commit()

  const onText = (val) => {
    setText(val)
    if (!idRef.current) {
      if (!val) return
      idRef.current = api.canvas.current.addText(stack(val, vertical), {
        fill, fontSize, fontFamily: fontName, textAlign: align,
        charSpacing: spacing * 10,
        ...(strokeW ? { stroke, strokeWidth: strokeW } : {}),
      })
      setCreated(true)
    } else {
      patch({ text: stack(val, vertical) })
    }
    commit()
  }

  const toggleVertical = () => {
    const v = !vertical
    setVertical(v)
    patch({ text: stack(text, v) })
    commit()
  }
  const setAlignment = (a) => { setAlign(a); patch({ textAlign: a }); commit() }
  const onSize = (v) => { setFontSize(v); patch({ fontSize: Number(v) }) }
  const onSpacing = (v) => { setSpacing(v); patch({ charSpacing: Number(v) * 10 }) }
  const onFill = (v) => { setFill(v); patch({ fill: v }); commit() }
  const onStroke = (v) => { setStroke(v); patch({ stroke: v, strokeWidth: strokeW || 1 }); if (!strokeW) setStrokeW(1); commit() }
  const onStrokeW = (v) => { setStrokeW(v); patch({ stroke, strokeWidth: Number(v) }); commit() }

  const pickGraphic = (font) => {
    setFontName(font)
    loadFont(font).then(() => { patch({ fontFamily: font }); commit() })
  }

  if (view === 'font') {
    return (
      <FontPanel
        current={fontName}
        previewText={text || 'Abg'}
        onPick={(f) => setFontName(f)}
        onBack={() => setView('main')}
      />
    )
  }
  if (view === 'effects') {
    return <EffectsPanel onBack={() => setView('main')} />
  }
  if (view === 'fillColor') {
    return (
      <ColorPanel
        value={fill}
        onChange={onFill}
        onPattern={(url) => api.canvas.current.setPatternFill(url)}
        onBack={() => setView('main')}
      />
    )
  }
  if (view === 'strokeColor') {
    return <ColorPanel value={stroke} onChange={onStroke} onBack={() => setView('main')} />
  }

  return (
    <div className="ps-panel ps-textpanel">
      <button type="button" className="ps-panel__back" onClick={() => { api.canvas.current.deselect(); api.setTool(null) }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* text entry */}
      <div className="ps-textbox">
        <textarea
          value={text}
          placeholder="Enter text"
          onChange={(e) => onText(e.target.value)}
          rows={3}
        />
        <div className="ps-textbox__bar">
          <button
            type="button"
            className={`ps-tbtn${vertical ? ' is-on' : ''}`}
            title="Vertical text"
            onClick={toggleVertical}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <text x="9" y="9" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="sans-serif">A</text>
              <text x="9" y="19" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="sans-serif">B</text>
              <path d="M16 5 v14 M13.5 16.5 L16 19 l2.5 -2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="ps-textbox__sp" />
          {['left', 'center', 'right'].map((a) => (
            <button
              key={a}
              type="button"
              className={`ps-tbtn${align === a ? ' is-on' : ''}`}
              title={`Align ${a}`}
              onClick={() => setAlignment(a)}
            >
              <i className={`nxi nxi-${a}-align`} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {created && (
        <>
          {/* tabs */}
          <div className="ps-fonttabs">
            <button type="button" className={`ps-fonttab${tab === 'simple' ? ' is-active' : ''}`} onClick={() => setTab('simple')}>Simple Fonts</button>
            <button type="button" className={`ps-fonttab${tab === 'graphic' ? ' is-active' : ''}`} onClick={() => setTab('graphic')}>Graphic Fonts</button>
          </div>

          {tab === 'simple' ? (
            <>
              <button type="button" className="ps-trow" onClick={() => setView('font')}>
                <span className="ps-trow__l">Fonts</span>
                <span className="ps-trow__r" style={{ fontFamily: `"${fontName}"` }}>{fontName} ›</span>
              </button>

              <div className="ps-tslider">
                <label>Font size</label>
                <input type="range" min="8" max="160" value={fontSize}
                  onChange={(e) => onSize(e.target.value)} onPointerUp={commit} />
                <span className="ps-tslider__v">{fontSize}</span>
              </div>

              <div className="ps-tslider">
                <label>Letter Spacing</label>
                <input type="range" min="0" max="100" value={spacing}
                  onChange={(e) => onSpacing(e.target.value)} onPointerUp={commit} />
                <span className="ps-tslider__v">{spacing}</span>
              </div>

              <button type="button" className="ps-trow" onClick={() => setView('fillColor')}>
                <span className="ps-trow__l">Fill color</span>
                <span className="ps-trow__r">
                  <span className="ps-swatch" style={{ background: fill }} /> ›
                </span>
              </button>

              <div className="ps-trow ps-trow--border">
                <span className="ps-trow__l">Border color</span>
                <span className="ps-trow__r">
                  <input className="ps-borderw" type="number" min="0" max="40" value={strokeW}
                    onChange={(e) => onStrokeW(e.target.value)} />
                  <span className="ps-borderw__u">px</span>
                  <button type="button" className="ps-swatch" style={{ background: stroke }} onClick={() => setView('strokeColor')} />
                </span>
              </div>

              <button type="button" className="ps-trow" onClick={() => setView('effects')}>
                <span className="ps-trow__l">Effects</span>
                <span className="ps-trow__r">Plain Text ›</span>
              </button>
            </>
          ) : (
            <div className="ps-graphicgrid">
              {GRAPHIC_FONTS.map((f) => (
                <button key={f} type="button" className={`ps-graphicrow${fontName === f ? ' is-active' : ''}`}
                  onClick={() => pickGraphic(f)}>
                  <span style={{ fontFamily: `"${f}"` }}>{text || 'Abc'}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
