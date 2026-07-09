import { useEffect, useRef, useState, useCallback } from 'react'
import { fabric } from 'fabric'
import { useUndoRedo } from './useUndoRedo'

export function useFabricCanvas(canvasElementRef, { width, height } = {}) {
  const [canvas, setCanvas] = useState(null)
  const [zoom, setZoom] = useState(100)
  const { saveState, undo, redo, canUndo, canRedo } = useUndoRedo()
  const fabricRef = useRef(null)
  const isProcessingRef = useRef(false)

  const zoomRef = useRef(100)

  const handleZoom = useCallback((newZoom) => {
    if (!fabricRef.current) return
    const clampedZoom = Math.round(Math.min(Math.max(newZoom, 60), 500))
    const fc = fabricRef.current
    
    fc.setZoom(clampedZoom / 100)
    fc.setWidth(width * (clampedZoom / 100))
    fc.setHeight(height * (clampedZoom / 100))
    
    zoomRef.current = clampedZoom
    setZoom(clampedZoom)
    fc.renderAll()
  }, [width, height])

  useEffect(() => {
    if (!canvasElementRef.current) return

    const fc = new fabric.Canvas(canvasElementRef.current, {
      width: width ?? 600,
      height: height ?? 500,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true
    })

    fabricRef.current = fc

    function onKeyDown(e) {
      const tag = e.target.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        const active = fc.getActiveObject()
        if (!active) return
        if (active.type === 'activeSelection') {
          active.forEachObject((obj) => fc.remove(obj))
          fc.discardActiveObject()
        } else {
          fc.remove(active)
        }
        fc.renderAll()
        saveState(fc)
      }
      
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const active = fc.getActiveObject()
        if (!active) return
        
        active.clone((cloned) => {
          cloned.set({
            left: active.left + 20,
            top: active.top + 20,
          })
          
          if (cloned.type === 'activeSelection') {
            cloned.canvas = fc
            cloned.forEachObject((obj) => {
              obj.set({
                left: obj.left + 20,
                top: obj.top + 20,
              })
            })
          }
          
          fc.add(cloned)
          fc.setActiveObject(cloned)
          fc.renderAll()
          saveState(fc)
        })
      }

      if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleZoom(zoomRef.current + 10)
      }

      if ((e.key === '-') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleZoom(zoomRef.current - 10)
      }

      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleZoom(100)
      }
    }

    function handleMouseWheel(opt) {
      const delta = opt.e.deltaY
      let newZoom = zoomRef.current
      newZoom = newZoom - delta / 10
      handleZoom(newZoom)
      opt.e.preventDefault()
      opt.e.stopPropagation()
    }

    fc.on('mouse:wheel', handleMouseWheel)

    window.addEventListener('keydown', onKeyDown)

    function handleObjectAdded() {
      if (!isProcessingRef.current) {
        saveState(fc)
      }
    }

    function handleObjectRemoved() {
      if (!isProcessingRef.current) {
        saveState(fc)
      }
    }

    function handleObjectModified() {
      if (!isProcessingRef.current) {
        saveState(fc)
      }
    }

    function handlePathCreated() {
      saveState(fc)
    }

    function handleSelectionCleared() {
      saveState(fc)
    }

    fc.on('object:added', handleObjectAdded)
    fc.on('object:removed', handleObjectRemoved)
    fc.on('object:modified', handleObjectModified)
    fc.on('path:created', handlePathCreated)
    fc.on('selection:cleared', handleSelectionCleared)

    setCanvas(fc)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      fc.dispose()
    }
  }, [])

  return { canvas, canvasRef: canvasElementRef, saveState, undo, redo, canUndo, canRedo, zoom, handleZoom }
}
