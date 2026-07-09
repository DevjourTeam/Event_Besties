import { useState, useEffect, useRef } from 'react'
import { fabric } from 'fabric'
import { loadDesign } from '../utils/shopifyDesign'
import '../styles/adminView.css'

export default function AdminView() {
  const canvasRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [designData, setDesignData] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const designId = params.get('id')

    if (!designId) {
      setError('No design ID provided in URL')
      setLoading(false)
      return
    }

    setLoading(true)

    loadDesign(designId)
      .then((data) => {
        setDesignData(data)
        setLoading(false)

        const canvas = new fabric.Canvas(canvasRef.current, {
          width: 500,
          height: 600,
          selection: false
        })

        canvas.loadFromJSON(data.fabricJSON, () => {
          canvas.forEachObject((obj) => {
            obj.selectable = false
            obj.evented = false
            obj.hoverCursor = 'default'
          })
          canvas.selection = false
          canvas.interactive = false
          canvas.renderAll()
        })

        const parsed = JSON.parse(data.fabricJSON)
        if (parsed.width && parsed.height) {
          canvas.setWidth(parsed.width)
          canvas.setHeight(parsed.height)
        }
      })
      .catch((err) => {
        setError('Design not found: ' + designId + '. Please check the design ID and try again.')
        setLoading(false)
      })
  }, [])

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString()
  }

  function handleCopyId() {
    const params = new URLSearchParams(window.location.search)
    const designId = params.get('id')
    navigator.clipboard.writeText(designId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadJson() {
    if (!designData) return
    const blob = new Blob([designData.fabricJSON], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'design-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner" />
        <p>Loading design...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-error">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <h1>Design Order</h1>
        <span className="admin-powered">Powered by Devjour</span>
      </header>

      <main className="admin-main">
        <div className="admin-canvas-column">
          <div className="admin-canvas-wrapper">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <aside className="admin-info-column">
          <div className="admin-info-card">
            <h2>Order Details</h2>
            
            <div className="admin-info-row">
              <span className="admin-info-label">Product</span>
              <span className="admin-info-value">{designData.productTitle}</span>
            </div>
            
            <div className="admin-info-row">
              <span className="admin-info-label">Type</span>
              <span className="admin-info-value">
                {designData.designType === 'template' ? 'Template' : 'Custom Canvas'}
              </span>
            </div>
            
            <div className="admin-info-row">
              <span className="admin-info-label">Source Design</span>
              <span className="admin-info-value admin-info-mono">{designData.sourceDesignId}</span>
            </div>
            
            <div className="admin-info-row">
              <span className="admin-info-label">Created</span>
              <span className="admin-info-value">{formatDate(designData.createdAt)}</span>
            </div>

            <div className="admin-thumbnail-section">
              <span className="admin-info-label">Preview</span>
              {designData.thumbnailUrl && (
                <img src={designData.thumbnailUrl} alt="Design thumbnail" className="admin-thumbnail" />
              )}
            </div>

            <div className="admin-actions">
              <button 
                className="admin-btn-primary"
                onClick={() => window.open(designData.printFileUrl, '_blank')}
              >
                Download Print File
              </button>
              
              <button 
                className="admin-btn-secondary"
                onClick={() => window.print()}
              >
                Print This Page
              </button>
              
              <button 
                className="admin-btn-copy"
                onClick={handleCopyId}
              >
                {copied ? 'Copied!' : 'Copy Design ID'}
              </button>
              
              <button 
                className="admin-btn-link"
                onClick={handleDownloadJson}
              >
                Download Design JSON
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}