import { useState, useEffect, useRef } from 'react'
import { applyTextEffect } from '../utils/textEffects'
import { loadFont } from '../utils/fontLoader'
import TextEffectPicker from './TextEffectPicker'
import WarpEffectsPanel from './WarpEffectsPanel'
import { WARP_PRESETS, applyWarpToText } from '../utils/textWarp'

const SIMPLE_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Comic Sans MS',
  'Tahoma',
  'Palatino Linotype',
  'Garamond',
  'Bookman',
  'Candara',
  'Segoe UI',
  'Calibri',
  'Impact',
  'Century Gothic',
  'Lucida Console',
  'Arial Black',
  'Lucida Sans Unicode',
  'Arial Narrow',
  'Franklin Gothic Medium',
  'Courier',
  'Cambria',
  'Consolas'
]

const GRAPHIC_FONTS = [
  'Fredoka One',
  'Pacifico',
  'Boogaloo',
  'Titan One',
  'Lilita One',
  'Righteous',
  'Baloo 2',
  'Permanent Marker',
  'Comic Neue',
  'Chewy',
  'Luckiest Guy',
  'Bangers',
  'Kaushan Script',
  'Lobster',
  'Sacramento',
  'Pinyon Script',
  'Dancing Script',
  'Great Vibes',
  'Alfa Slab One',
  'Bebas Neue',
  'Big Shoulders Display',
  'Bungee',
  'Cabin Sketch',
  'Chunky',
  'Comfortaa',
  'Courgette',
  'Creepster',
  'Devonshire',
  'Eater',
  'Frijole',
  'Fugaz One',
  'Gloria Hallelujah',
  'Gochi Hand',
  'Gravitas One',
  'Homemade Apple',
  'Inspiration',
  'Jolly Lodger',
  'Kelly Slab',
  'Lemon Tuesday',
  'Lobster Two',
  'Love Ya Like A Sister',
  'Metamorphous',
  'Monoton',
  'Moulp',
  'Neucha',
  'Niconne',
  'Nosifer',
  'Passion One',
  'Play',
  'Pompiere',
  'Ranchers',
  'Raving Rebel',
  'Redressed',
  'Renner',
  'Risque',
  'Road Rage',
  'Roboto Slab',
  'Rock Salt',
  'Russo One',
  'Shadows Into Light',
  'Shrikhand',
  'Staatliches',
  'Stint Ultra Expanded',
  'Stretch Pro',
  'Sunshiney',
  'The Girl Next Door',
  'Ultra',
  'UnifrakturMaguntia',
  'Vibur',
  'Waiting for the Horizon',
  'Wallpoet',
  'Warnes',
  'Wellfleet',
  'Yeseva One',
  'Zcool KuaiLe',
  'Zilla Slab'
]

export default function TextEditorPanel({ canvas, selectedObject, isTextSelected, onBack, saveState, onDelete, onToast }) {
  const [text, setText] = useState('')
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState(36)
  const [charSpacing, setCharSpacing] = useState(0)
  const [fillColor, setFillColor] = useState('#000000')
  const [fontTab, setFontTab] = useState('simple')
  const [fontWeight, setFontWeight] = useState('normal')
  const [fontStyle, setFontStyle] = useState('normal')
  const [textAlign, setTextAlign] = useState('left')
  const [underline, setUnderline] = useState(false)
  const [posX, setPosX] = useState(0)
  const [posY, setPosY] = useState(0)
  const [showWarpPanel, setShowWarpPanel] = useState(false)

  // Debounce timer for warp re-renders triggered by sliders / typing
  const warpDebounceRef = useRef(null)

  useEffect(() => {
    GRAPHIC_FONTS.forEach((font) => loadFont(font))
  }, [])

  // Sync panel state from the selected object.
  // For warped images, read from _warpSource so all the original text
  // properties are reflected in the controls.
  useEffect(() => {
    if (!selectedObject || !isTextSelected) return

    const src = (selectedObject._isWarpedText && selectedObject._warpSource)
      ? selectedObject._warpSource
      : selectedObject

    setText(src.text || '')
    setFontFamily(src.fontFamily || 'Arial')
    setFontSize(src.fontSize || 36)
    setCharSpacing(src.charSpacing || 0)
    setFillColor(typeof src.fill === 'string' ? src.fill : '#000000')
    setFontWeight(src.fontWeight || 'normal')
    setFontStyle(src.fontStyle || 'normal')
    setTextAlign(src.textAlign || 'left')
    setUnderline(!!src.underline)
    // Position comes from the actual canvas object, not the source
    setPosX(Math.round(selectedObject.left || 0))
    setPosY(Math.round(selectedObject.top || 0))
  }, [selectedObject, isTextSelected])

  // ── Warp-aware update helpers ────────────────────────────────────────────

  // Immediately re-apply warp with updated source properties.
  // Used for discrete changes: font family, bold/italic toggle.
  function immediateWarpUpdate(updates) {
    const obj = canvas?.getActiveObject()
    if (!obj?._isWarpedText) return
    Object.assign(obj._warpSource, updates)
    const { warpId, strength } = obj._warpSource
    applyWarpToText(canvas, obj, warpId, strength, saveState).catch(console.error)
  }

  // Debounced warp re-apply for slider / text input changes.
  function scheduleWarpUpdate(updates) {
    clearTimeout(warpDebounceRef.current)
    warpDebounceRef.current = setTimeout(() => {
      const obj = canvas?.getActiveObject()
      if (!obj?._isWarpedText) return
      Object.assign(obj._warpSource, updates)
      const { warpId, strength } = obj._warpSource
      applyWarpToText(canvas, obj, warpId, strength, saveState).catch(console.error)
    }, 300)
  }

  // Generic update: dispatches to warp-update or plain Fabric set.
  function updateTextObject(updates) {
    if (!canvas || !selectedObject) return
    if (selectedObject._isWarpedText) {
      immediateWarpUpdate(updates)
    } else {
      selectedObject.set(updates)
      canvas.renderAll()
      saveState?.(canvas)
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleTextChange(newText) {
    setText(newText)
    if (selectedObject?._isWarpedText) {
      scheduleWarpUpdate({ text: newText })
    } else {
      updateTextObject({ text: newText })
    }
  }

  function handleFontFamilyChange(family) {
    setFontFamily(family)
    updateTextObject({ fontFamily: family })
  }

  function handleFontSizeChange(size) {
    setFontSize(size)
    if (selectedObject?._isWarpedText) {
      scheduleWarpUpdate({ fontSize: size })
    } else {
      updateTextObject({ fontSize: size })
    }
  }

  function handleCharSpacingChange(spacing) {
    setCharSpacing(spacing)
    if (selectedObject?._isWarpedText) {
      scheduleWarpUpdate({ charSpacing: spacing })
    } else {
      updateTextObject({ charSpacing: spacing })
    }
  }

  function handleFillColorChange(color) {
    setFillColor(color)
    if (selectedObject?._isWarpedText) {
      scheduleWarpUpdate({ fill: color })
    } else {
      updateTextObject({ fill: color })
    }
  }

  function toggleBold() {
    const newWeight = fontWeight === 'bold' ? 'normal' : 'bold'
    setFontWeight(newWeight)
    updateTextObject({ fontWeight: newWeight })
  }

  function toggleItalic() {
    const newStyle = fontStyle === 'italic' ? 'normal' : 'italic'
    setFontStyle(newStyle)
    updateTextObject({ fontStyle: newStyle })
  }

  function toggleUnderline() {
    const newUnderline = !underline
    setUnderline(newUnderline)
    updateTextObject({ underline: newUnderline })
  }

  function handleAlignChange(align) {
    setTextAlign(align)
    updateTextObject({ textAlign: align })
  }

  // Position: move the image directly without re-warping.
  // Also keep _warpSource in sync so restoring text lands at the right spot.
  function handlePosChange(axis, val) {
    const num = Number(val)
    const obj = canvas?.getActiveObject() || selectedObject
    if (!obj || !canvas) return

    if (axis === 'x') {
      setPosX(num)
      obj.set({ left: num })
      if (obj._warpSource) obj._warpSource.left = num
    } else {
      setPosY(num)
      obj.set({ top: num })
      if (obj._warpSource) obj._warpSource.top = num
    }
    canvas.renderAll()
    saveState?.(canvas)
  }

  function handleTextEffectSelect(preset) {
    if (selectedObject && canvas && !selectedObject._isWarpedText) {
      applyTextEffect(selectedObject, preset, canvas)
      saveState?.(canvas)
    }
  }

  // Restore warped text back to a plain IText
  function handleRestoreText() {
    const fabric = window.fabric
    const obj = canvas?.getActiveObject()
    if (!fabric || !obj?._warpSource) return
    const src = obj._warpSource
    const restored = new fabric.IText(src.text, {
      left:       src.left,
      top:        src.top,
      fontFamily: src.fontFamily,
      fontSize:   src.fontSize,
      fill:       src.fill,
      fontWeight: src.fontWeight || 'normal',
      fontStyle:  src.fontStyle  || 'normal',
      originX:    'center',
      originY:    'center',
    })
    canvas.remove(obj)
    canvas.add(restored)
    canvas.setActiveObject(restored)
    canvas.renderAll()
    saveState(canvas)
  }

  const isWarped = !!(selectedObject?._isWarpedText)
  const fonts = fontTab === 'simple' ? SIMPLE_FONTS : GRAPHIC_FONTS

  return (
    <div className="panel-content text-editor-panel">
      {showWarpPanel ? (
        <WarpEffectsPanel
          canvas={canvas}
          selectedObject={selectedObject}
          saveState={saveState}
          onClose={() => setShowWarpPanel(false)}
        />
      ) : (
        <>
          {/* Banner shown when the selected object is a warped image */}
          {isWarped && (
            <div className="warp-edit-banner">
              <span>✏ Text is warped — editing live</span>
              <button onClick={handleRestoreText}>
                Remove Warp
              </button>
            </div>
          )}

          <div className="text-input-section">
            <textarea
              className="text-input"
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Enter your text..."
            />
            <div className="text-style-icons">
              <button
                className={`style-icon ${fontWeight === 'bold' ? 'active' : ''}`}
                onClick={toggleBold}
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                className={`style-icon ${fontStyle === 'italic' ? 'active' : ''}`}
                onClick={toggleItalic}
                title="Italic"
              >
                <em>I</em>
              </button>
              {!isWarped && (
                <>
                  <button
                    className={`style-icon ${underline ? 'active' : ''}`}
                    onClick={toggleUnderline}
                    title="Underline"
                  >
                    <span style={{ textDecoration: 'underline' }}>U</span>
                  </button>
                  <button
                    className={`style-icon ${textAlign === 'left' ? 'active' : ''}`}
                    onClick={() => handleAlignChange('left')}
                    title="Align Left"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
                    </svg>
                  </button>
                  <button
                    className={`style-icon ${textAlign === 'center' ? 'active' : ''}`}
                    onClick={() => handleAlignChange('center')}
                    title="Align Center"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
                    </svg>
                  </button>
                  <button
                    className={`style-icon ${textAlign === 'right' ? 'active' : ''}`}
                    onClick={() => handleAlignChange('right')}
                    title="Align Right"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="font-tabs">
            <button
              className={`font-tab ${fontTab === 'simple' ? 'active' : ''}`}
              onClick={() => setFontTab('simple')}
            >
              Simple Fonts
            </button>
            <button
              className={`font-tab ${fontTab === 'graphic' ? 'active' : ''}`}
              onClick={() => setFontTab('graphic')}
            >
              Graphic Fonts
            </button>
          </div>

          <div className="control-row">
            <span className="control-label">Font</span>
            <select
              className="font-select"
              value={fontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
            >
              {fonts.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {fontTab === 'graphic' && !isWarped && (
            <TextEffectPicker
              selectedObject={selectedObject}
              canvas={canvas}
              saveState={saveState}
            />
          )}

          <div className="control-row slider-row">
            <span className="control-label">Font size</span>
            <input
              type="range"
              min="8"
              max="200"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
              className="slider"
            />
            <span className="slider-value">{fontSize}</span>
          </div>

          <div className="control-row slider-row">
            <span className="control-label">Letter Spacing</span>
            <input
              type="range"
              min="-50"
              max="200"
              value={charSpacing}
              onChange={(e) => handleCharSpacingChange(parseInt(e.target.value))}
              className="slider"
            />
            <span className="slider-value">{charSpacing}</span>
          </div>

          <div className="control-row">
            <span className="control-label">Fill color</span>
            <div className="color-picker-row">
              <input
                type="color"
                value={fillColor}
                onChange={(e) => handleFillColorChange(e.target.value)}
                className="color-input"
              />
              <span className="color-value">{fillColor}</span>
            </div>
          </div>

          <div
            className="control-row clickable"
            onClick={() => setShowWarpPanel(true)}
          >
            <span className="control-label">Warp Effect</span>
            <span className="control-value">
              {canvas?.getActiveObject()?._warpSource?.warpId
                ? WARP_PRESETS.find(p => p.id === canvas.getActiveObject()._warpSource.warpId)?.label
                : 'Plain Text'}
            </span>
          </div>

          <div className="control-row">
            <span className="control-label">Position</span>
          </div>
          <div className="position-inputs">
            <div className="pos-input">
              <label>X</label>
              <input
                type="number"
                value={posX}
                onChange={(e) => handlePosChange('x', e.target.value)}
              />
            </div>
            <div className="pos-input">
              <label>Y</label>
              <input
                type="number"
                value={posY}
                onChange={(e) => handlePosChange('y', e.target.value)}
              />
            </div>
          </div>

          <button
            className="action-btn action-btn--danger"
            onClick={onDelete}
          >
            Delete Text
          </button>
        </>
      )}
    </div>
  )
}
