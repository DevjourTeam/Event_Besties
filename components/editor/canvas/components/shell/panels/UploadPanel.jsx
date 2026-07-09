import { useRef, useState } from 'react'
import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'

const MAX_BYTES = 40 * 1024 * 1024 // 40 MB
const ACCEPT = ['image/svg+xml', 'image/jpeg', 'image/jpg', 'image/png']
const ACCEPT_ATTR = '.svg,.jpg,.jpeg,.png,image/svg+xml,image/jpeg,image/png'
const TYPE_CHIPS = ['SVG', 'JPEG', 'JPG', 'PNG']

const TERMS_MSG =
  'On uploading one or several images, you agree to terms on using these images. ' +
  "Making use of third-party images or infringing somebody else's rights is unlawful."

export default function UploadPanel({ onBack }) {
  const { recentUploads } = useEditorState()
  const api = useEditorApi()
  const inputRef = useRef(null)
  const [agreed, setAgreed] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const validate = (file) => {
    const okType =
      ACCEPT.includes(file.type) || /\.(svg|jpe?g|png)$/i.test(file.name)
    if (!okType) return 'Unsupported file type. Use SVG, JPEG, JPG or PNG.'
    if (file.size > MAX_BYTES) return 'File is too large (max 40 MB).'
    return ''
  }

  const handleFiles = (fileList) => {
    setError('')
    if (!agreed) {
      setError('Please agree to the Terms and Conditions first.')
      return
    }
    const files = Array.from(fileList || [])
    if (!files.length) return
    files.forEach((file) => {
      const err = validate(file)
      if (err) {
        setError(err)
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const dataURL = reader.result
        api.canvas.current.addImage(dataURL)
        api.addUpload({
          id: 'up' + Math.random().toString(36).slice(2, 9),
          name: file.name,
          dataURL,
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="ps-panel">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      {/* dropzone */}
      <div
        className={`ps-dropzone${dragOver ? ' is-drag' : ''}${agreed ? '' : ' is-disabled'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <span className="ps-dropzone__icon">
          <i className="nxi nxi-upload" aria-hidden="true" />
        </span>
        <p className="ps-dropzone__hint">Drag and drop file here</p>
        <div className="ps-or"><span>OR</span></div>
        <button
          type="button"
          className="ps-btn ps-btn--gold ps-dropzone__browse"
          onClick={() => (agreed ? inputRef.current?.click() : setError('Please agree to the Terms and Conditions first.'))}
        >
          Browse File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* accepted types */}
      <p className="ps-upload__types-label">Accepted File Types(Max size: 40 MB)</p>
      <div className="ps-chips">
        {TYPE_CHIPS.map((t) => (
          <span key={t} className="ps-chip">{t}</span>
        ))}
      </div>

      {error && <p className="ps-upload__error">{error}</p>}

      {/* agreement + tooltip */}
      <label className="ps-agree">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setError('') }}
        />
        <span className="ps-agree__text">
          I Agree{' '}
          <span className="ps-tt">
            <a className="ps-link" onClick={(e) => e.preventDefault()} href="#terms">
              Terms and Conditions.
            </a>
            <span className="ps-tt__bubble" role="tooltip">{TERMS_MSG}</span>
          </span>
        </span>
      </label>

      {/* recent uploads */}
      {recentUploads.length > 0 && (
        <>
          <div className="ps-or ps-or--spaced"><span>OR</span></div>
          <h3 className="ps-upload__recent-title">Recent uploaded</h3>
          <div className="ps-recent">
            {recentUploads.map((u) => (
              <button
                key={u.id}
                type="button"
                className="ps-recent__item"
                title={u.name}
                onClick={() => api.canvas.current.addImage(u.dataURL)}
              >
                <img src={u.dataURL} alt={u.name} draggable={false} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
