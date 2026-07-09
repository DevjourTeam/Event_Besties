import { useState, useRef } from 'react'
import WarpPreviewIcon from './WarpPreviewIcon'
import { WARP_PRESETS, applyWarpToText } from '../utils/textWarp'

export default function WarpEffectsPanel({ canvas, selectedObject, saveState, onClose }) {
  const [strength, setStrength] = useState(() => {
    return selectedObject?._warpSource?.strength ? Math.round(selectedObject._warpSource.strength * 100) : 50
  })
  const [selectedWarpId, setSelectedWarpId] = useState(() => {
    return selectedObject?._warpSource?.warpId || 'straight'
  })
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState(null)
  const debounceTimer = useRef(null)

  async function handleApplyWarp(warpId, strengthVal) {
    if (!canvas) return
    // Always grab the current active object — selectedObject prop can be stale
    // after a previous warp replaced the original IText with a Path
    const obj = canvas.getActiveObject() || selectedObject
    if (!obj) return

    setApplying(true)
    setApplyError(null)

    try {
      await applyWarpToText(
        canvas,
        obj,
        warpId,
        strengthVal / 100,
        saveState
      )
    } catch (err) {
      setApplyError(err.message)
      setTimeout(() => setApplyError(null), 3000)
    }

    setApplying(false)
  }

  function handleSliderChange(e) {
    const val = parseInt(e.target.value)
    setStrength(val)
    
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      if (selectedWarpId !== 'straight') {
        handleApplyWarp(selectedWarpId, val)
      }
    }, 300)
  }

  function handleWarpSelect(preset) {
    setSelectedWarpId(preset.id)
    handleApplyWarp(preset.id, strength)
  }

  function handleCancel() {
    const fabric = window.fabric
    const obj = canvas?.getActiveObject()
    if (fabric && obj?._warpSource) {
      const src = obj._warpSource
      const restored = new fabric.IText(src.text, {
        left: src.left,
        top: src.top,
        fontFamily: src.fontFamily,
        fontSize: src.fontSize,
        fill: src.fill,
        fontWeight: src.fontWeight || 'normal',
        fontStyle: src.fontStyle || 'normal',
        originX: 'center',
        originY: 'center',
      })
      canvas.remove(obj)
      canvas.add(restored)
      canvas.setActiveObject(restored)
      canvas.renderAll()
      saveState(canvas)
    }
    onClose()
  }

  return (
    <div className="warp-panel">
      <div className="warp-effect-size-row">
        <label>Effect size</label>
        <input
          type="range"
          min={1}
          max={100}
          value={strength}
          onChange={handleSliderChange}
        />
        <span className="value">{strength}</span>
      </div>

      <div className="warp-apply-status">
        {applying && 'Applying...'}
        {applyError && <span className="error">{applyError}</span>}
      </div>

      <div className="warp-grid">
        {WARP_PRESETS.map(preset => (
          <WarpPreviewIcon
            key={preset.id}
            warpId={preset.id}
            label={preset.label}
            isActive={selectedWarpId === preset.id}
            onClick={() => handleWarpSelect(preset)}
          />
        ))}
      </div>

      <div className="warp-panel-buttons">
        <button className="warp-btn-cancel" onClick={handleCancel}>
          Cancel
        </button>
        <button className="warp-btn-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}