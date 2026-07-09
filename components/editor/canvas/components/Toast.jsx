import { useState, useEffect } from 'react'

export default function Toast({ message, type = 'info', duration = 3000, onClose, action }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div className={`toast toast--${type} ${isVisible ? 'toast--visible' : ''}`}>
      <div className="toast__content">
        <span className="toast__message">{message}</span>
        {action && (
          <button className="toast__action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      <button className="toast__close" onClick={() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
