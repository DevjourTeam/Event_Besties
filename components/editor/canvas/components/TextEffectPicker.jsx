import { useState } from 'react'
import { TEXT_EFFECT_PRESETS, applyTextEffect } from '../utils/textEffects'

export default function TextEffectPicker({ selectedObject, canvas, saveState }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEffect, setSelectedEffect] = useState('none')

  const currentEffect = TEXT_EFFECT_PRESETS.find(e => e.id === selectedEffect)

  function handleEffectSelect(preset) {
    if (selectedObject && canvas) {
      applyTextEffect(selectedObject, preset, canvas)
      setSelectedEffect(preset.id)
      saveState?.(canvas)
    }
    setIsOpen(false)
  }

  return (
    <div className="text-effect-picker">
      <div className="text-effect-label">Text Effect</div>
      <button 
        className="text-effect-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-effect-preview" style={getPreviewStyle(currentEffect)}>
          Aa
        </span>
        <span className="text-effect-name">{currentEffect?.label || 'None'}</span>
        <span className="text-effect-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="text-effect-dropdown">
          {TEXT_EFFECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`text-effect-option ${preset.id === selectedEffect ? 'active' : ''}`}
              onClick={() => handleEffectSelect(preset)}
            >
              <span className="text-effect-option-preview" style={getPreviewStyle(preset)}>
                Aa
              </span>
              <span className="text-effect-option-label">{preset.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function getPreviewStyle(preset) {
  if (!preset || !preset.styles) return {}
  
  const { fill, stroke, strokeWidth, shadow } = preset.styles
  const style = {}
  
  if (fill && typeof fill === 'object') {
    const stops = fill.colorStops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')
    style.background = `linear-gradient(180deg, ${stops})`
    style.webkitBackgroundClip = 'text'
    style.webkitTextFillColor = 'transparent'
    style.color = '#000'
  } else if (fill && fill !== 'transparent') {
    style.color = fill
  } else {
    style.color = 'transparent'
    style.webkitTextFillColor = 'transparent'
  }
  
  if (stroke && strokeWidth > 0) {
    style.textShadow = `0 0 0 ${stroke}`
  }
  
  if (shadow && typeof shadow === 'object') {
    style.textShadow = `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.color}`
  } else if (shadow && typeof shadow === 'string') {
    style.textShadow = shadow
  }
  
  return style
}