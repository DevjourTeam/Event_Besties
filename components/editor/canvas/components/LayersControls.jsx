import { useState, useEffect, useRef } from 'react'

const LAYER_ICONS = {
  'i-text': 'T',
  'image': '🖼',
  'rect': '▢',
  'circle': '○',
  'path': '✎',
  'default': '◉'
}

export default function LayersControls({ canvas, onLayersChange, showPanel, onTogglePanel, onCloseOther }) {
  const [layers, setLayers] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const popupRef = useRef(null)

  useEffect(() => {
    if (showPanel && onCloseOther) {
      onCloseOther()
    }
  }, [showPanel, onCloseOther])

  function refreshLayers() {
    if (!canvas) return
    const objects = canvas.getObjects().map((obj, idx) => ({
      id: obj.id || `layer-${idx}`,
      name: obj.type === 'i-text' ? 'Text' : obj.type === 'image' ? 'Image' : obj.type === 'rect' ? 'Rectangle' : obj.type === 'circle' ? 'Circle' : obj.type === 'path' ? 'Shape' : obj.customName || `Layer ${idx + 1}`,
      visible: obj.visible !== false,
      locked: obj.selectable === false,
      type: obj.type,
      object: obj
    })).reverse()
    setLayers(objects)
  }

  useEffect(() => {
    if (!canvas) return
    
    if (showPanel) {
      refreshLayers()
    }

    const handleObjectAdded = () => {
      if (showPanel) {
        refreshLayers()
      }
    }

    const handleObjectRemoved = () => {
      if (showPanel) {
        refreshLayers()
      }
    }

    const handleSelectionCreated = () => {
      if (showPanel) {
        refreshLayers()
      }
    }

    const handleSelectionUpdated = () => {
      if (showPanel) {
        refreshLayers()
      }
    }

    canvas.on('object:added', handleObjectAdded)
    canvas.on('object:removed', handleObjectRemoved)
    canvas.on('selection:created', handleSelectionCreated)
    canvas.on('selection:updated', handleSelectionUpdated)

    return () => {
      canvas.off('object:added', handleObjectAdded)
      canvas.off('object:removed', handleObjectRemoved)
      canvas.off('selection:created', handleSelectionCreated)
      canvas.off('selection:updated', handleSelectionUpdated)
    }
  }, [canvas, showPanel])

  function toggleLayersPanel() {
    if (!showPanel) {
      refreshLayers()
    }
    onTogglePanel()
  }

  function handleLayerSelect(layer) {
    if (!canvas) return
    canvas.setActiveObject(layer.object)
    canvas.renderAll()
  }

  function handleLayerVisibility(layer, e) {
    e.stopPropagation()
    layer.object.set('visible', !layer.visible)
    canvas.renderAll()
    refreshLayers()
  }

  function handleLayerLock(layer, e) {
    e.stopPropagation()
    const newLocked = !layer.locked
    layer.object.set({
      selectable: !newLocked,
      evented: !newLocked
    })
    canvas.renderAll()
    refreshLayers()
    onLayersChange?.()
  }

  function handleLayerDelete(layer, e) {
    e.stopPropagation()
    canvas.remove(layer.object)
    canvas.renderAll()
    refreshLayers()
    onLayersChange?.()
  }

  function handleMoveLayer(layer, direction, e) {
    e.stopPropagation()
    const objects = canvas.getObjects()
    const currentIdx = objects.indexOf(layer.object)
    if (direction === 'up' && currentIdx < objects.length - 1) {
      canvas.bringForward(layer.object)
    } else if (direction === 'down' && currentIdx > 0) {
      canvas.sendBackwards(layer.object)
    }
    canvas.renderAll()
    refreshLayers()
    onLayersChange?.()
  }

  function handleDragStart(e, index) {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setDragImage(e.currentTarget, 0, 20)
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  function handleDragLeave(e) {
  }

  function handleDrop(e, dropIndex) {
    e.preventDefault()
    const dragIndex = draggedIndex
    
    if (dragIndex === null || dragIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const objects = canvas.getObjects()
    const fromIdx = dragIndex
    const toIdx = dropIndex
    
    const movedObject = objects[fromIdx]
    
    const diff = toIdx - fromIdx
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        canvas.bringForward(movedObject)
      }
    } else {
      for (let i = 0; i < Math.abs(diff); i++) {
        canvas.sendBackwards(movedObject)
      }
    }

    canvas.renderAll()
    refreshLayers()
    onLayersChange?.()
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="canvas-layers-controls" ref={popupRef}>
      <button 
        className="canvas-layers-btn"
        onClick={toggleLayersPanel}
        title="Layers"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </button>
      
      {showPanel && (
        <div className="canvas-layers-popup">
          <div className="canvas-layers-header">
            <span>Layers ({layers.length})</span>
            <button className="canvas-layers-close" onClick={onTogglePanel}>×</button>
          </div>
          
          {layers.length === 0 ? (
            <div className="canvas-layers-empty">No objects on canvas</div>
          ) : (
            <div className="canvas-layers-list">
              {layers.map((layer, idx) => (
                <div 
                  key={layer.id} 
                  className={`canvas-layer-item ${draggedIndex === idx ? 'dragging' : ''} ${dragOverIndex === idx ? 'drag-over' : ''}`}
                  onClick={() => handleLayerSelect(layer)}
                >
                  <div 
                    className="canvas-layer-drag-handle"
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/>
                      <circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/>
                      <circle cx="9" cy="18" r="2"/><circle cx="15" cy="18" r="2"/>
                    </svg>
                  </div>
                  <div className="canvas-layer-icon">
                    {LAYER_ICONS[layer.type] || LAYER_ICONS.default}
                  </div>
                  <span className="canvas-layer-name">{layer.name}</span>
                  <div className="canvas-layer-actions">
                    <button 
                      className={`canvas-layer-action ${!layer.visible ? 'inactive' : ''}`}
                      onClick={(e) => handleLayerVisibility(layer, e)}
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {layer.visible ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.72a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      )}
                    </button>
                    <button 
                      className={`canvas-layer-action ${layer.locked ? 'active' : ''}`}
                      onClick={(e) => handleLayerLock(layer, e)}
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {layer.locked ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                        </svg>
                      )}
                    </button>
                    <button 
                      className="canvas-layer-action"
                      onClick={(e) => handleMoveLayer(layer, 'up', e)}
                      title="Bring Forward"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15"/>
                      </svg>
                    </button>
                    <button 
                      className="canvas-layer-action"
                      onClick={(e) => handleMoveLayer(layer, 'down', e)}
                      title="Send Backward"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    <button 
                      className="canvas-layer-action delete"
                      onClick={(e) => handleLayerDelete(layer, e)}
                      title="Delete Layer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
