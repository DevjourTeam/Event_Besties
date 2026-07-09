export default function SuccessOverlay({ visible, thumbnailUrl, productTitle, onContinue, onViewCart }) {
  if (!visible) return null

  return (
    <div className="success-overlay">
      <div className="success-card">
        <div className="success-icon">✓</div>
        <h2 className="success-title">Added to cart!</h2>
        <p className="success-subtitle">{productTitle}</p>
        {thumbnailUrl && (
          <img 
            src={thumbnailUrl} 
            alt="Design preview" 
            className="success-thumbnail"
          />
        )}
        <div className="success-actions">
          <button className="success-btn-success" onClick={onViewCart}>
            View Cart
          </button>
          <button className="success-btn-secondary" onClick={onContinue}>
            Continue Designing
          </button>
        </div>
      </div>
    </div>
  )
}