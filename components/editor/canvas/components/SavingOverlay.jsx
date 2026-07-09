export default function SavingOverlay({ visible, steps, error, onRetry, onClose }) {
  if (!visible) return null

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <span className="saving-dot saving-dot--pending" />
      case 'active':
        return <span className="saving-dot saving-dot--active" />
      case 'done':
        return <span className="saving-check">✓</span>
      case 'error':
        return <span className="saving-x">✕</span>
      default:
        return null
    }
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'saving-step--pending'
      case 'active': return 'saving-step--active'
      case 'done': return 'saving-step--done'
      case 'error': return 'saving-step--error'
      default: return ''
    }
  }

  return (
    <div className="saving-overlay">
      <div className="saving-card">
        <button className="saving-close-btn" onClick={onClose}>×</button>
        <h2 className="saving-title">Saving your design...</h2>
        
        <div className="saving-steps">
          {steps.map((step, index) => (
            <div key={step.id} className={`saving-step ${getStatusClass(step.status)}`}>
              {getStatusIcon(step.status)}
              <span className="saving-label">{step.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="saving-error">
            <p>Something went wrong</p>
            <p className="saving-error-msg">{error}</p>
            <button className="saving-retry-btn" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}