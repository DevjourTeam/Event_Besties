import { useState, useRef, useEffect } from 'react'

const PRESET_COLORS = [
  '#ffffff', '#000000', '#f0f0f0', '#e0e0e0', '#d0d0d0', '#c0c0c0',
  '#ff6b6b', '#ff8e8e', '#ffaaaa', '#4ecdc4', '#7dded5', '#96ceb4',
  '#45b7d1', '#74b9ff', '#a29bfe', '#6c5ce7', '#fd79a8', '#fdcb6e',
  '#00b894', '#00cec9', '#ffeaa7', '#fab1a0', '#ff7675', '#636e72'
]

const RECENT_COLORS_KEY = 'canvas_bg_recent_colors'

function getRecentColors() {
  try {
    const data = localStorage.getItem(RECENT_COLORS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveRecentColor(color) {
  try {
    const recent = getRecentColors().filter(c => c !== color)
    recent.unshift(color)
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(recent.slice(0, 12)))
  } catch {}
}

export default function CanvasBackgroundControls({ canvas, saveState, defaultColor = '#ffffff', showPicker, onTogglePicker, onCloseOther }) {
  const [currentBgColor, setCurrentBgColor] = useState(defaultColor)
  const [hexInput, setHexInput] = useState(defaultColor)
  const [tempColor, setTempColor] = useState(defaultColor)
  const popupRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target) && !e.target.closest('.canvas-bg-btn')) {
        onTogglePicker()
      }
    }
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPicker, onTogglePicker])

  useEffect(() => {
    if (showPicker && onCloseOther) {
      onCloseOther()
    }
  }, [showPicker, onCloseOther])

  function handleColorChange(color) {
    setCurrentBgColor(color)
    setHexInput(color)
    setTempColor(color)
    if (canvas) {
      canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas))
      saveState?.(canvas)
    }
    saveRecentColor(color)
    onTogglePicker()
  }

  function handleHexSubmit(e) {
    e.preventDefault()
    let color = hexInput.trim()
    if (!color.startsWith('#')) color = '#' + color
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      handleColorChange(color)
    }
  }

  function handlePickerChange(e) {
    const color = e.target.value
    setTempColor(color)
    setHexInput(color)
  }

  function handlePickerApply() {
    handleColorChange(tempColor)
  }

  const recentColors = getRecentColors()

  return (
    <div className="canvas-bg-controls" ref={popupRef}>
      <button 
        className="canvas-bg-btn"
        onClick={onTogglePicker}
        title="Background Color"
      >
        <div 
          className="canvas-bg-color-preview"
          style={{ backgroundColor: currentBgColor }}
        />
      </button>
      
      {showPicker && (
        <div className="canvas-bg-picker-popup">
          <div className="canvas-bg-picker-header">
            <div 
              className="canvas-bg-preview-large"
              style={{ backgroundColor: tempColor }}
            />
            <form onSubmit={handleHexSubmit} className="canvas-bg-hex-form">
              <input
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                className="canvas-bg-hex-input"
                placeholder="#ffffff"
                maxLength={7}
              />
              <button type="submit" className="canvas-bg-apply-btn">Apply</button>
            </form>
          </div>
          
          <input
            type="color"
            value={tempColor}
            onChange={handlePickerChange}
            className="canvas-bg-color-input"
          />
          
          <button 
            type="button" 
            className="canvas-bg-picker-confirm"
            onClick={handlePickerApply}
          >
            Confirm Color
          </button>
          
          <div className="canvas-bg-section-title">Preset Colors</div>
          <div className="canvas-bg-presets">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                className={`canvas-bg-preset ${currentBgColor === color ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
              />
            ))}
          </div>

          {recentColors.length > 0 && (
            <>
              <div className="canvas-bg-section-title">Recent</div>
              <div className="canvas-bg-presets">
                {recentColors.map((color, idx) => (
                  <button
                    key={idx}
                    className={`canvas-bg-preset ${currentBgColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(color)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
