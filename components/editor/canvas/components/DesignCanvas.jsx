import { useRef, useEffect, useState } from 'react'
import { useFabricCanvas } from '../hooks/useFabricCanvas'
import { applyClipPath } from '../utils/shapeClipPath'

export default function DesignCanvas({
  width = 500,
  height = 600,
  svgClipPath = null,
  backgroundColor = '#ffffff',
  onCanvasReady,
  onUndoStateChange,
  onZoomChange
}) {
  const canvasElementRef = useRef(null)
  const { canvas, canvasRef, saveState, undo, redo, canUndo, canRedo, zoom, handleZoom } = useFabricCanvas(
    canvasElementRef,
    { width, height }
  )

  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    if (onUndoStateChange) onUndoStateChange(canUndo, canRedo)
  }, [canUndo, canRedo])

  useEffect(() => {
    if (onZoomChange) onZoomChange(zoom)
  }, [zoom, onZoomChange])

  useEffect(() => {
    if (!canvas) return

    canvas.setBackgroundColor(backgroundColor, canvas.renderAll.bind(canvas))

    if (svgClipPath) {
      applyClipPath(canvas, svgClipPath)
    }

    saveState(canvas)

    if (onCanvasReady) {
      onCanvasReady({ canvas, undo, redo, saveState, zoom, handleZoom })
    }

    function checkEmpty() {
      setIsEmpty(canvas.getObjects().length === 0)
    }

    canvas.on('object:added', checkEmpty)
    canvas.on('object:removed', checkEmpty)

    return () => {
      canvas.off('object:added', checkEmpty)
      canvas.off('object:removed', checkEmpty)
    }
  }, [canvas])

  const canvasWidth = width * (zoom / 100)
  const canvasHeight = height * (zoom / 100)

  return (
    <div className="canvas-wrapper" style={{ position: 'relative', width: canvasWidth, height: canvasHeight }}>
      <canvas ref={canvasRef} />

      {svgClipPath && (
        <div
          className="canvas-guide-overlay"
          style={{ width: canvasWidth, height: canvasHeight }}
          aria-hidden="true"
        />
      )}

      {isEmpty && (
        <div className="canvas-empty-hint" aria-hidden="true">
          Upload an image or add text to begin
        </div>
      )}
    </div>
  )
}
