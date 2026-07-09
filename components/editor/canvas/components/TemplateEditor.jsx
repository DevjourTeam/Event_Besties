import { useState, useRef } from 'react'
import TopBar from './TopBar'
import LeftPanel from './LeftPanel'
import BottomBar from './BottomBar'
import DimensionOverlay from './DimensionOverlay'
import DesignCanvas from './DesignCanvas'
import SavingOverlay from './SavingOverlay'
import SuccessOverlay from './SuccessOverlay'
import { loadTemplate, getEditableObjects, getObjectById } from '../utils/templateLoader'
import { getConfig } from '../config/editorConfig'
import { saveDesign, SAVE_STEPS_CONFIG } from '../utils/shopifyDesign'
import { addToCart } from '../hooks/useShopifyCart'

export default function TemplateEditor({ design, variantId, productTitle, editorTitle = 'Template Editor' }) {
  const [canvas, setCanvas] = useState(null)
  const [saving, setSaving] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [savingSteps, setSavingSteps] = useState([])
  const [saveError, setSaveError] = useState(null)
  const [editableObjects, setEditableObjects] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [successVisible, setSuccessVisible] = useState(false)
  const [savedThumbnailUrl, setSavedThumbnailUrl] = useState('')
  const [leftPanelView, setLeftPanelView] = useState('menu')
  const [activeTab, setActiveTab] = useState('create')
  const [selectedSize, setSelectedSize] = useState(null)
  const saveFnRef = useRef(null)

  const currentSize = selectedSize || design.availableSizes?.find(s => s.label === design.sizeLabel) || design.availableSizes?.[0]
  const canvasWidth = currentSize?.width || design.canvasWidth
  const canvasHeight = currentSize?.height || design.canvasHeight

  async function handleCanvasReady({ canvas: fc, saveState }) {
    setCanvas(fc)
    saveFnRef.current = saveState
    window.__fabricCanvas = fc

    fc.on('mouse:down', (e) => {
      if (e.target && e.target.editable === false) {
        setTooltipPos({ x: e.pointer.x, y: e.pointer.y })
        setTooltipVisible(true)
        setTimeout(() => setTooltipVisible(false), 2000)
      }
    })

    if (design.templateJSON) {
      await loadTemplate(fc, design.templateJSON)
      const editables = getEditableObjects(fc)
      const objs = editables.map((obj) => ({
        id: obj.id,
        type: obj.type,
        label: obj.label || obj.type,
        fabricObj: obj,
        completed: false
      }))
      setEditableObjects(objs)
      setLeftPanelView('text')
    }
  }

  function handleTextChange(objId, newText) {
    const obj = getObjectById(canvas, objId)
    if (obj) {
      obj.set('text', newText)
      canvas.renderAll()
      saveFnRef.current?.(canvas)
      setEditableObjects((prev) =>
        prev.map((o) => (o.id === objId ? { ...o, completed: !!newText } : o))
      )
    }
  }

  function handleImageReplace(objId, file) {
    const obj = getObjectById(canvas, objId)
    if (!obj || !file) return

    const newUrl = URL.createObjectURL(file)
    const left = obj.left
    const top = obj.top
    const scaleX = obj.scaleX
    const scaleY = obj.scaleY
    const angle = obj.angle

    obj.setSrc(newUrl, () => {
      obj.set({ left, top, scaleX, scaleY, angle })
      canvas.renderAll()
      saveFnRef.current?.(canvas)
      setEditableObjects((prev) =>
        prev.map((o) => (o.id === objId ? { ...o, completed: true } : o))
      )
    }, { crossOrigin: 'anonymous' })
  }

  async function handleProcess() {
    if (!canvas) return
    
    setOverlayVisible(true)
    setSavingSteps(SAVE_STEPS_CONFIG.map(s => ({ ...s, status: 'pending' })))
    setSaveError(null)
    setSaving(true)

    const updateStep = (stepId, status) => {
      setSavingSteps(prev => prev.map(s => s.id === stepId ? { ...s, status } : s))
    }

    try {
      const { designId, thumbnailUrl, printFileUrl } = await saveDesign(
        canvas,
        {
          sourceDesignId: getConfig().designId,
          designType: 'template',
          variantId: getConfig().variantId,
          productTitle: getConfig().productTitle
        },
        updateStep
      )
      
      setSaving(true)
      try {
        await addToCart(designId, thumbnailUrl, printFileUrl)
        setOverlayVisible(false)
        setSavedThumbnailUrl(thumbnailUrl)
        setSuccessVisible(true)
      } catch (cartErr) {
        setSaveError('Cart error: ' + cartErr.message)
      } finally {
        setSaving(false)
      }
    } catch (err) {
      setSaveError(err.message)
      setSaving(false)
    }
  }

  const selectedObj = editableObjects.find((o) => o.id === selectedFieldId)
  const completedCount = editableObjects.filter((o) => o.completed).length

  return (
    <div className="editor-container">
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showBackButton={leftPanelView !== 'menu'}
        onBack={() => setLeftPanelView('menu')}
        editorTitle={editorTitle}
      />

      <div className="editor-main">
        <aside className="left-panel">
          <div className="panel-content">
            <div className="template-notice">
              Fixed elements cannot be moved. Edit the fields below.
            </div>

            {editableObjects.length > 0 && (
              <div className="template-progress">
                {completedCount} of {editableObjects.length} fields completed
              </div>
            )}

            <div className="template-fields-list">
              {editableObjects.length === 0 && design.templateJSON === null && (
                <div className="template-no-data">
                  No template loaded. Add template_json to your Shopify Metaobject.
                </div>
              )}

              {editableObjects.map((obj) => (
                <div
                  key={obj.id}
                  className={`template-field-card${selectedFieldId === obj.id ? ' template-field-card--selected' : ''}${obj.completed ? ' template-field-card--completed' : ''}`}
                  onClick={() => setSelectedFieldId(obj.id)}
                >
                  <div className="template-field-header">
                    <span className="template-field-type">
                      {obj.type === 'text' ? 'T' : '🖼'}
                    </span>
                    <span className="template-field-label">{obj.label}</span>
                    {obj.completed && <span className="template-field-check">✓</span>}
                  </div>

                  {selectedFieldId === obj.id && obj.type === 'text' && (
                    <div className="template-field-editor">
                      <textarea
                        className="text-content-area"
                        value={obj.fabricObj.text || ''}
                        onChange={(e) => handleTextChange(obj.id, e.target.value)}
                        placeholder={`Enter ${obj.label}...`}
                      />
                    </div>
                  )}

                  {selectedFieldId === obj.id && obj.type === 'image' && (
                    <div className="template-field-editor">
                      <input
                        type="file"
                        accept="image/*"
                        id={`img-replace-${obj.id}`}
                        style={{ display: 'none' }}
                        onChange={(e) => handleImageReplace(obj.id, e.target.files[0])}
                      />
                      <label htmlFor={`img-replace-${obj.id}`} className="template-replace-btn">
                        Replace Photo
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="canvas-area">
          <div className="canvas-wrapper">
            <DesignCanvas
              key={currentSize?.id || 'default'}
              width={canvasWidth}
              height={canvasHeight}
              svgClipPath={design.svgClipPath}
              backgroundColor="#ffffff"
              onCanvasReady={handleCanvasReady}
            />
            {canvas && (
              <DimensionOverlay 
                canvasWidth={canvasWidth} 
                canvasHeight={canvasHeight}
              />
            )}
            {tooltipVisible && (
              <div className="template-tooltip" style={{ left: tooltipPos.x + 10, top: tooltipPos.y + 10 }}>
                This element is part of the template design
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomBar
        productName={design.name}
        price={selectedSize?.price || design.availableSizes?.[0]?.price || null}
        onProcess={handleProcess}
        saving={saving}
        design={{...design, sizeLabel: selectedSize?.label || design.sizeLabel}}
        onSizeChange={setSelectedSize}
      />

      <SavingOverlay
        visible={overlayVisible}
        steps={savingSteps}
        error={saveError}
        onRetry={handleProcess}
        onClose={() => setOverlayVisible(false)}
      />

      <SuccessOverlay
        visible={successVisible}
        thumbnailUrl={savedThumbnailUrl}
        productTitle={getConfig().productTitle}
        onViewCart={() => window.location.href = '/cart'}
        onContinue={() => setSuccessVisible(false)}
      />
    </div>
  )
}