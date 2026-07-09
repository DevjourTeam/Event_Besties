import { getConfig } from '../config/editorConfig'

export default function TopBar({ 
  activeTab = 'create', 
  onTabChange,
  showBackButton = false,
  onBack,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  onSave,
  onZoom,
  selectedObject,
  zoomLevel = 100,
  editorTitle = 'Design Editor'
}) {

  return (
    <header className="topbar">
      <div className="topbar-left">
        {showBackButton && (
          <button className="back-button" onClick={onBack}>
            <span className="back-arrow">←</span>
            Back
          </button>
        )}
      </div>

      <div className="topbar-center">
        <span className="editor-title">{editorTitle}</span>
      </div>

      <div className="topbar-right">
        {selectedObject && (
          <>
            <button className="icon-button" onClick={onSave}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              Save
            </button>
            <span className="separator">|</span>
            <button className="icon-button" onClick={() => onZoom?.(-10)} title="Zoom Out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <span className="zoom-level">{zoomLevel}%</span>
            <button className="icon-button" onClick={() => onZoom?.(10)} title="Zoom In">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button className="icon-button" onClick={() => onZoom?.(0)} title="Reset Zoom">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  )
}