import { useEffect, useState } from 'react'
import { fabric } from 'fabric'
import {
  applyFilter,
  removeBackground as removeBg,
  setOpacity,
  isLowResolution
} from '../utils/imageTools'
import TextControls from './TextControls'

const FILTERS = ['none', 'grayscale', 'sepia', 'invert', 'brightness', 'contrast']

export default function PropertiesPanel({ canvas, saveState }) {
  const [selectedObject, setSelectedObject] = useState(null)
  const [activeFilter, setActiveFilter] = useState('none')
  const [opacityVal, setOpacityVal] = useState(100)
  const [posX, setPosX] = useState(0)
  const [posY, setPosY] = useState(0)
  const [removingBg, setRemovingBg] = useState(false)
  const [bgError, setBgError] = useState(null)

  useEffect(() => {
    if (!canvas) return

    function onSelect(e) {
      const obj = e.selected?.[0] ?? canvas.getActiveObject()
      if (!obj) return
      setSelectedObject(obj)
      setOpacityVal(Math.round((obj.opacity ?? 1) * 100))
      setPosX(Math.round(obj.left ?? 0))
      setPosY(Math.round(obj.top ?? 0))
      setActiveFilter('none')
      setBgError(null)
    }

    function onClear() {
      setSelectedObject(null)
    }

    canvas.on('selection:created', onSelect)
    canvas.on('selection:updated', onSelect)
    canvas.on('selection:cleared', onClear)

    return () => {
      canvas.off('selection:created', onSelect)
      canvas.off('selection:updated', onSelect)
      canvas.off('selection:cleared', onClear)
    }
  }, [canvas])

  function handleFilter(name) {
    if (!selectedObject || !(selectedObject instanceof fabric.Image)) return
    setActiveFilter(name)
    applyFilter(canvas, selectedObject, name)
    saveState(canvas)
  }

  function handleRemoveBg() {
    if (!selectedObject || !(selectedObject instanceof fabric.Image)) return
    setBgError(null)
    removeBg(
      canvas,
      selectedObject,
      () => setRemovingBg(true),
      () => {
        setRemovingBg(false)
        saveState(canvas)
      },
      (err) => {
        setRemovingBg(false)
        setBgError('Failed — try again')
        console.error('Background removal error:', err)
      }
    )
  }

  function handleOpacityChange(e) {
    const val = Number(e.target.value)
    setOpacityVal(val)
    if (!selectedObject) return
    setOpacity(canvas, selectedObject, val)
    saveState(canvas)
  }

  function handlePosChange(axis, raw) {
    if (!selectedObject) return
    const num = Number(raw)
    if (axis === 'x') {
      setPosX(num)
      selectedObject.set({ left: num })
    } else {
      setPosY(num)
      selectedObject.set({ top: num })
    }
    canvas.renderAll()
    saveState(canvas)
  }

  function handleDelete() {
    if (!selectedObject) return
    canvas.remove(selectedObject)
    canvas.discardActiveObject()
    canvas.renderAll()
    saveState(canvas)
    setSelectedObject(null)
  }

  if (!selectedObject) {
    return (
      <div className="properties-panel">
        <span className="panel-label">Properties</span>
        <p className="properties-empty">Select an object to edit its properties</p>
      </div>
    )
  }

  const isImage = selectedObject instanceof fabric.Image
  const isText = selectedObject instanceof fabric.Text

  return (
    <div className="properties-panel">
      <span className="panel-label">Properties</span>

      {isText && (
        <TextControls
          canvas={canvas}
          selectedObject={selectedObject}
          saveState={saveState}
        />
      )}

      {isImage && (
        <>
          <div className="prop-section">
            <div className="prop-section-title">Filters</div>
            <div className="filter-buttons">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  className={`filter-btn${activeFilter === f ? ' filter-btn--active' : ''}`}
                  onClick={() => handleFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="prop-section">
            <div className="prop-section-title">Background</div>
            <button
              className="prop-action-btn"
              onClick={handleRemoveBg}
              disabled={removingBg}
            >
              {removingBg ? (
                <><span className="btn-spinner" /> Processing...</>
              ) : (
                'Remove Background'
              )}
            </button>
            {bgError && <div className="prop-error">{bgError}</div>}
          </div>

          <div className="prop-section">
            <div className="prop-section-title">
              Opacity <span className="prop-value">{opacityVal}%</span>
            </div>
            <input
              className="prop-slider"
              type="range"
              min={0}
              max={100}
              value={opacityVal}
              onChange={handleOpacityChange}
            />
          </div>

          <div className="prop-section">
            <div className="prop-section-title">Size</div>
            <div className="prop-info">
              {selectedObject.getElement().naturalWidth} &times; {selectedObject.getElement().naturalHeight} px
            </div>
            {isLowResolution(selectedObject) && (
              <div className="prop-warning">&#9888; Low resolution — may print poorly</div>
            )}
          </div>
        </>
      )}

      <div className="prop-section">
        <div className="prop-section-title">Position</div>
        <div className="prop-row">
          <label className="prop-label">X</label>
          <input
            className="prop-number"
            type="number"
            value={posX}
            onChange={(e) => handlePosChange('x', e.target.value)}
          />
        </div>
        <div className="prop-row">
          <label className="prop-label">Y</label>
          <input
            className="prop-number"
            type="number"
            value={posY}
            onChange={(e) => handlePosChange('y', e.target.value)}
          />
        </div>
      </div>

      <div className="prop-section">
        <button className="prop-delete-btn" onClick={handleDelete}>
          Delete Object
        </button>
      </div>
    </div>
  )
}
