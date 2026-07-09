import { useState, useEffect } from 'react'
import MainToolMenu from './MainToolMenu'
import ImageUploadPanel from './ImageUploadPanel'
import TextEditorPanel from './TextEditorPanel'
import ShapeEditorPanel from './ShapeEditorPanel'
import Toast from './Toast'

export default function LeftPanel({ 
    view, 
    onViewChange, 
    canvas, 
    saveState
}) {
  const [imageSelected, setImageSelected] = useState(false)
  const [selectedObject, setSelectedObject] = useState(null)
  const [isImage, setIsImage] = useState(false)
  const [isText, setIsText] = useState(false)
  const [isShape, setIsShape] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!canvas) return

    function handleSelection(e) {
      const obj = e.selected?.[0] || canvas.getActiveObject()
      if (obj) {
        setSelectedObject(obj)
        // Warped text is a fabric.Image but must be treated as text, not an image
        const isWarpedText = obj._isWarpedText === true
        const isImg = obj.type === 'image' && !isWarpedText
        const isTxt = obj.type === 'i-text' || obj.type === 'text' || isWarpedText
        const isRect = obj.type === 'rect'
        const isCircle = obj.type === 'circle'
        const isTri = obj.type === 'triangle'
        const isLine = obj.type === 'line'
        const isShapeType = isRect || isCircle || isTri || isLine

        setIsImage(isImg)
        setIsText(isTxt)
        setIsShape(isShapeType)

        if (isWarpedText) {
          onViewChange('text')
        } else if (isImg) {
          setImageSelected(true)
          onViewChange('upload')
        } else if (isTxt) {
          onViewChange('text')
        } else if (isShapeType) {
          onViewChange('shape')
        }
      } else {
        setSelectedObject(null)
        setIsImage(false)
        setIsText(false)
        setIsShape(false)
      }
    }

    function handleClear() {
      setSelectedObject(null)
      setIsImage(false)
      setIsText(false)
      setIsShape(false)
    }

    canvas.on('selection:created', handleSelection)
    canvas.on('selection:updated', handleSelection)
    canvas.on('selection:cleared', handleClear)

    return () => {
      canvas.off('selection:created', handleSelection)
      canvas.off('selection:updated', handleSelection)
      canvas.off('selection:cleared', handleClear)
    }
  }, [canvas, onViewChange])

  function handleSelectTool(tool) {
    if (tool === 'text') {
      if (canvas) {
        const { fabric } = window
        const text = new fabric.IText('Your Text', {
          left: canvas.width / 2 - 50,
          top: canvas.height / 2,
          fontFamily: 'Arial',
          fontSize: 36,
          fill: '#000000'
        })
        canvas.add(text)
        canvas.setActiveObject(text)
        canvas.renderAll()
        saveState?.(canvas)
      }
      onViewChange('text')
    } else if (tool === 'upload') {
      onViewChange('upload')
    } else if (tool === 'rectangle') {
      addShape('rect')
    } else if (tool === 'circle') {
      addShape('circle')
    } else if (tool === 'triangle') {
      addShape('triangle')
    } else if (tool === 'line') {
      addShape('line')
    }
  }

  function addShape(type) {
    if (!canvas) return
    const { fabric } = window
    let shape
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    switch (type) {
      case 'rect':
        shape = new fabric.Rect({
          left: centerX - 75,
          top: centerY - 50,
          width: 150,
          height: 100,
          fill: '#cccccc',
          stroke: '#888888',
          strokeWidth: 2,
          rx: 4,
          ry: 4
        })
        break
      case 'circle':
        shape = new fabric.Circle({
          left: centerX - 60,
          top: centerY - 60,
          radius: 60,
          fill: '#cccccc',
          stroke: '#888888',
          strokeWidth: 2
        })
        break
      case 'triangle':
        shape = new fabric.Triangle({
          left: centerX - 60,
          top: centerY - 60,
          width: 120,
          height: 100,
          fill: '#cccccc',
          stroke: '#888888',
          strokeWidth: 2
        })
        break
      case 'line':
        shape = new fabric.Line([centerX - 100, centerY, centerX + 100, centerY], {
          left: centerX - 100,
          top: centerY - 1,
          stroke: '#333333',
          strokeWidth: 3
        })
        break
      default:
        return
    }
    
    canvas.add(shape)
    canvas.setActiveObject(shape)
    canvas.renderAll()
    saveState?.(canvas)
    onViewChange('shape')
  }

  function handleBack() {
    setImageSelected(false)
    // Deselect any selected object
    if (canvas) {
      canvas.discardActiveObject()
      canvas.renderAll()
    }
    setSelectedObject(null)
    setIsImage(false)
    setIsText(false)
    onViewChange('menu')
  }

  function handleDelete() {
    if (canvas && selectedObject) {
      canvas.remove(selectedObject)
      canvas.discardActiveObject()
      canvas.renderAll()
      saveState?.(canvas)
      setSelectedObject(null)
      setIsImage(false)
      setIsText(false)
      setIsShape(false)
      onViewChange('menu')
    }
  }

  const renderContent = () => {
    if (view === 'upload') {
      return (
        <ImageUploadPanel 
          canvas={canvas} 
          saveState={saveState} 
          selectedObject={selectedObject}
          isImageSelected={isImage}
          onDelete={handleDelete}
        />
      )
    }
    
    if (view === 'text') {
      return (
        <TextEditorPanel 
          canvas={canvas} 
          selectedObject={selectedObject}
          isTextSelected={isText}
          onBack={handleBack}
          saveState={saveState}
          onDelete={handleDelete}
          onToast={setToast}
        />
      )
    }

    if (view === 'shape') {
      return (
        <ShapeEditorPanel 
          canvas={canvas} 
          selectedObject={selectedObject}
          isShapeSelected={isShape}
          saveState={saveState}
          onDelete={handleDelete}
        />
      )
    }
    
    return (
      <MainToolMenu onSelectTool={handleSelectTool} />
    )
  }

  return (
    <aside className="left-panel">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {renderContent()}
    </aside>
  )
}