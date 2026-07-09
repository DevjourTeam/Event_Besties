import { getConfig } from '../config/editorConfig'
import { useState } from 'react'

export default function BottomBar({ 
  thumbnailUrl, 
  productName,
  price,
  onProcess,
  saving = false,
  design = null,
  onSizeChange = null
}) {
  const config = getConfig()
  const displayName = productName || config.productTitle || 'Product'
  const truncatedName = displayName.length > 12 ? displayName.substring(0, 12) + '...' : displayName
  const [showPopup, setShowPopup] = useState(false)
  const [selectedSizeId, setSelectedSizeId] = useState(design?.sizeLabel ? design.availableSizes?.find(s => s.label === design.sizeLabel)?.id : null)

  const availableSizes = design?.availableSizes || []
  const printProfile = design?.printProfile || 'N/A'
  const description = design?.description || 'No description available'

  const selectedSize = availableSizes.find(s => s.id === selectedSizeId)
  const currentPrice = selectedSize?.price || price || '£89.99'

  const handleSizeSelect = (size) => {
    setSelectedSizeId(size.id)
    if (onSizeChange) {
      onSizeChange(size)
    }
  }

  return (
    <>
      <footer className="bottom-bar">
        <div 
          className="bottom-bar-left clickable"
          onClick={() => setShowPopup(true)}
          title="View product info"
        >
          <div className="product-thumbnail">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={displayName} />
            ) : (
              <div className="thumbnail-placeholder" />
            )}
            <span className="thumbnail-indicator" />
          </div>
          <span className="product-name">{truncatedName}</span>
        </div>

        <div className="bottom-bar-right">
          {currentPrice && <span className="price-label">{currentPrice}</span>}
          <button 
            className="process-button" 
            onClick={onProcess}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="btn-spinner" />
                Processing...
              </>
            ) : (
              'Process'
            )}
          </button>
        </div>
      </footer>

      {showPopup && (
        <div className="product-popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="product-popup" onClick={e => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowPopup(false)}>×</button>
            
            <div className="popup-header">
              <div className="popup-thumbnail">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt={displayName} />
                ) : (
                  <div className="thumbnail-placeholder" />
                )}
              </div>
              <h3 className="popup-title">{displayName}</h3>
            </div>

            {availableSizes.length > 0 && (
              <div className="popup-section">
                <label>Select Size</label>
                <div className="size-options">
                  {availableSizes.map(size => (
                    <button 
                      key={size.id}
                      className={`size-option ${size.id === selectedSizeId ? 'selected' : ''}`}
                      onClick={() => handleSizeSelect(size)}
                    >
                      <span className="size-label">{size.label}</span>
                      <span className="size-price">{size.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="popup-section">
              <label>Print Profile</label>
              <span className="print-profile">{printProfile}</span>
            </div>

            <div className="popup-section">
              <label>Description</label>
              <p className="description">{description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}