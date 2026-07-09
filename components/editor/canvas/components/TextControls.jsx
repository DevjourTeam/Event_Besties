import { useState, useEffect } from 'react'
import { FONT_LIST, loadFont } from '../utils/fontLoader'

export default function TextControls({ canvas, selectedObject, saveState }) {
  const [fontFamily, setFontFamily] = useState('Montserrat')
  const [fontSize, setFontSize] = useState(36)
  const [color, setColor] = useState('#000000')
  const [bold, setBold] = useState(false)
  const [italic, setItalic] = useState(false)
  const [underline, setUnderline] = useState(false)
  const [textAlign, setTextAlign] = useState('left')
  const [charSpacing, setCharSpacing] = useState(0)
  const [text, setText] = useState('')

  useEffect(() => {
    if (!selectedObject) return
    setFontFamily(selectedObject.fontFamily ?? 'Montserrat')
    setFontSize(selectedObject.fontSize ?? 36)
    setColor(typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000')
    setBold(selectedObject.fontWeight === 'bold')
    setItalic(selectedObject.fontStyle === 'italic')
    setUnderline(!!selectedObject.underline)
    setTextAlign(selectedObject.textAlign ?? 'left')
    setCharSpacing(selectedObject.charSpacing ?? 0)
    setText(selectedObject.text ?? '')
  }, [selectedObject])

  async function handleFontFamily(e) {
    const val = e.target.value
    setFontFamily(val)
    await loadFont(val)
    selectedObject.set('fontFamily', val)
    canvas.renderAll()
    saveState(canvas)
  }

  function handleFontSize(e) {
    const val = Number(e.target.value)
    setFontSize(val)
    selectedObject.set('fontSize', val)
    canvas.renderAll()
    saveState(canvas)
  }

  function handleColor(e) {
    const val = e.target.value
    setColor(val)
    selectedObject.set('fill', val)
    canvas.renderAll()
    saveState(canvas)
  }

  function toggleBold() {
    const next = !bold
    setBold(next)
    selectedObject.set('fontWeight', next ? 'bold' : 'normal')
    canvas.renderAll()
    saveState(canvas)
  }

  function toggleItalic() {
    const next = !italic
    setItalic(next)
    selectedObject.set('fontStyle', next ? 'italic' : 'normal')
    canvas.renderAll()
    saveState(canvas)
  }

  function toggleUnderline() {
    const next = !underline
    setUnderline(next)
    selectedObject.set('underline', next)
    canvas.renderAll()
    saveState(canvas)
  }

  function handleAlign(align) {
    setTextAlign(align)
    selectedObject.set('textAlign', align)
    canvas.renderAll()
    saveState(canvas)
  }

  function handleCharSpacing(e) {
    const val = Number(e.target.value)
    setCharSpacing(val)
    selectedObject.set('charSpacing', val)
    canvas.renderAll()
    saveState(canvas)
  }

  function handleText(e) {
    const val = e.target.value
    setText(val)
    selectedObject.set('text', val)
    canvas.renderAll()
    saveState(canvas)
  }

  function handleDelete() {
    canvas.remove(selectedObject)
    canvas.discardActiveObject()
    canvas.renderAll()
    saveState(canvas)
  }

  return (
    <>
      <div className="prop-section">
        <div className="prop-section-title">Font</div>
        <select className="font-picker" value={fontFamily} onChange={handleFontFamily}>
          {FONT_LIST.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Size &amp; Color</div>
        <div className="prop-row">
          <label className="prop-label">Sz</label>
          <input
            className="prop-number"
            type="number"
            min={8}
            max={300}
            value={fontSize}
            onChange={handleFontSize}
          />
          <input
            className="text-color-picker"
            type="color"
            value={color}
            onChange={handleColor}
            title="Text color"
          />
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Style</div>
        <div className="text-style-buttons">
          <button
            className={`text-style-btn${bold ? ' text-style-btn--active' : ''}`}
            onClick={toggleBold}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            className={`text-style-btn${italic ? ' text-style-btn--active' : ''}`}
            onClick={toggleItalic}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            className={`text-style-btn${underline ? ' text-style-btn--active' : ''}`}
            onClick={toggleUnderline}
            title="Underline"
          >
            <span style={{ textDecoration: 'underline' }}>U</span>
          </button>
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Alignment</div>
        <div className="text-style-buttons">
          {['left', 'center', 'right'].map((a) => (
            <button
              key={a}
              className={`text-style-btn${textAlign === a ? ' text-style-btn--active' : ''}`}
              onClick={() => handleAlign(a)}
              title={a.charAt(0).toUpperCase() + a.slice(1)}
            >
              {a === 'left' ? '⬜L' : a === 'center' ? '⬛C' : '⬜R'}
            </button>
          ))}
        </div>
      </div>

      <div className="prop-section">
        <div className="prop-section-title">
          Letter Spacing <span className="prop-value">{charSpacing}</span>
        </div>
        <input
          className="prop-slider"
          type="range"
          min={-50}
          max={200}
          value={charSpacing}
          onChange={handleCharSpacing}
        />
      </div>

      <div className="prop-section">
        <div className="prop-section-title">Content</div>
        <textarea
          className="text-content-area"
          value={text}
          onChange={handleText}
          rows={3}
        />
      </div>

      <div className="prop-section">
        <button className="prop-delete-btn" onClick={handleDelete}>
          Delete Text
        </button>
      </div>
    </>
  )
}
