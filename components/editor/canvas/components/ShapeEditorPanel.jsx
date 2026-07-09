import { useState, useEffect } from 'react'

export default function ShapeEditorPanel({ canvas, selectedObject, isShapeSelected, saveState, onDelete }) {
  const [fillColor, setFillColor] = useState('#000000')
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(0)
  const [opacity, setOpacity] = useState(100)
  const [posX, setPosX] = useState(0)
  const [posY, setPosY] = useState(0)
  const [isHollow, setIsHollow] = useState(false)

  useEffect(() => {
    if (selectedObject && isShapeSelected) {
      setFillColor(selectedObject.fill || '#000000')
      setStrokeColor(selectedObject.stroke || '#000000')
      setStrokeWidth(selectedObject.strokeWidth || 0)
      setOpacity(Math.round((selectedObject.opacity ?? 1) * 100))
      setPosX(Math.round(selectedObject.left || 0))
      setPosY(Math.round(selectedObject.top || 0))
      setIsHollow(selectedObject.fill === 'transparent' || selectedObject.fill === null)
    }
  }, [selectedObject, isShapeSelected])

  function handleFillColorChange(color) {
    setFillColor(color)
    if (selectedObject && !isHollow) {
      selectedObject.set('fill', color)
      canvas?.renderAll()
      saveState?.(canvas)
    }
  }

  function handleHollowToggle(e) {
    const checked = e.target.checked
    setIsHollow(checked)
    if (selectedObject) {
      selectedObject.set('fill', checked ? 'transparent' : fillColor)
      canvas?.renderAll()
      saveState?.(canvas)
    }
  }

  function handleStrokeChange(color) {
    setStrokeColor(color)
    if (selectedObject) {
      selectedObject.set('stroke', color)
      canvas?.renderAll()
      saveState?.(canvas)
    }
  }

  function handleStrokeWidthChange(width) {
    setStrokeWidth(width)
    if (selectedObject) {
      selectedObject.set('strokeWidth', width)
      canvas?.renderAll()
      saveState?.(canvas)
    }
  }

  function handleOpacityChange(val) {
    setOpacity(val)
    if (selectedObject) {
      selectedObject.set('opacity', val / 100)
      canvas?.renderAll()
      saveState?.(canvas)
    }
  }

  function handlePosChange(axis, val) {
    const num = parseInt(val) || 0
    if (axis === 'x') setPosX(num)
    else setPosY(num)
    if (selectedObject) {
      selectedObject.set(axis === 'x' ? 'left' : 'top', num)
      canvas?.renderAll()
      saveState?.(canvas)
    }
  }

  return (
    <div className="panel-content shape-editor-panel">
      {isShapeSelected && (
        <>
          <div className="shape-edit-header">
            <h3 className="edit-title">Edit Shape</h3>
          </div>

          <div className="control-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isHollow}
                onChange={handleHollowToggle}
              />
              <span>Hollow (No Fill)</span>
            </label>
          </div>

          {!isHollow && (
            <div className="control-row">
              <span className="control-label">Fill Color</span>
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
          )}

          <div className="control-row slider-row">
            <span className="control-label">Opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
              className="slider"
            />
            <span className="slider-value">{opacity}%</span>
          </div>

          <div className="control-row">
            <span className="control-label">Stroke Color</span>
            <div className="color-picker-row">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => handleStrokeChange(e.target.value)}
                className="color-input"
              />
              <span className="color-value">{strokeColor}</span>
            </div>
          </div>

          <div className="control-row slider-row">
            <span className="control-label">Stroke Width</span>
            <input
              type="range"
              min="0"
              max="20"
              value={strokeWidth}
              onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
              className="slider"
            />
            <span className="slider-value">{strokeWidth}px</span>
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
            Delete Shape
          </button>
        </>
      )}
    </div>
  )
}