import { useRef, useState } from 'react'
import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

/**
 * Crop image panel — drag the box to move, drag the corner handle to resize.
 * Crop values are kept as fractions (0..1) of the displayed image, then applied
 * to the Fabric image via cropSelected().
 */
export default function CropPanel({ onBack }) {
  const { selection } = useEditorState()
  const api = useEditorApi()
  const stageRef = useRef(null)
  const drag = useRef(null)
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })

  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.startX) / d.rect.width
    const dy = (e.clientY - d.startY) / d.rect.height
    const o = d.orig
    if (d.mode === 'move') {
      setCrop({ ...o, x: clamp(o.x + dx, 0, 1 - o.w), y: clamp(o.y + dy, 0, 1 - o.h) })
    } else {
      setCrop({ ...o, w: clamp(o.w + dx, 0.05, 1 - o.x), h: clamp(o.h + dy, 0.05, 1 - o.y) })
    }
  }
  const onUp = () => {
    drag.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  const onDown = (e, mode) => {
    e.preventDefault()
    e.stopPropagation()
    drag.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      rect: stageRef.current.getBoundingClientRect(),
      orig: { ...crop },
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const done = () => {
    api.canvas.current.cropSelected({ rx: crop.x, ry: crop.y, rw: crop.w, rh: crop.h })
    onBack()
  }

  return (
    <div className="ps-panel ps-crop">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Crop image
      </button>

      <div className="ps-crop__stage ps-checker" ref={stageRef}>
        {/* full-resolution original so the crop preview stays sharp */}
        {(selection.origSrc || selection.src) && (
          <img src={selection.origSrc || selection.src} alt="" draggable={false} />
        )}
        <div
          className="ps-crop__box"
          style={{
            left: `${crop.x * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${crop.w * 100}%`,
            height: `${crop.h * 100}%`,
          }}
          onPointerDown={(e) => onDown(e, 'move')}
        >
          <span className="ps-crop__handle" onPointerDown={(e) => onDown(e, 'br')} />
        </div>
      </div>

      <div className="ps-adjust__btns">
        <button type="button" className="ps-btn ps-btn--dark" onClick={onBack}>Cancel</button>
        <button type="button" className="ps-btn ps-btn--gold" onClick={done}>Done</button>
      </div>
    </div>
  )
}
