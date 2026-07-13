import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'

/**
 * Gallery — everything the customer has uploaded this session, so they can drop
 * the same artwork onto the canvas again without re-uploading it.
 */
export default function GalleryPanel({ onBack }) {
  const { recentUploads } = useEditorState()
  const api = useEditorApi()

  const add = (dataURL) => api.canvas.current.addImage(dataURL)

  return (
    <div className="ps-panel ps-gallery">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Gallery
      </button>

      {recentUploads.length === 0 ? (
        <p className="ps-fontlist__empty">
          Nothing here yet. Images you upload appear here so you can reuse them.
        </p>
      ) : (
        <div className="ps-clipgrid">
          {recentUploads.map((u) => (
            <button
              key={u.id}
              type="button"
              className="ps-clipcell"
              onClick={() => add(u.dataURL)}
              title={u.name}
            >
              <img src={u.dataURL} alt={u.name} draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
