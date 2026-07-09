import { useEditorApi } from '../../../editor/EditorProvider'
import { SHAPES } from '../../../data/shapeLibrary'

/** "Solid objects" — grid of preset shapes. Click one to drop it on the canvas. */
export default function ShapeLibraryPanel({ onBack }) {
  const api = useEditorApi()

  const add = (path) => {
    api.canvas.current.addShapePath(path)
    // selecting the new shape switches the sidebar to the shape editor automatically
  }

  return (
    <div className="ps-panel ps-shapelib">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Solid objects
      </button>

      <div className="ps-shapegrid">
        {SHAPES.map((s) => (
          <button key={s.id} type="button" className="ps-shapecell" onClick={() => add(s.path)}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
              <path d={s.path} fill="#1b2333" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
