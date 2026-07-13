import { useEffect, useState } from 'react'
import { useEditorApi } from '../../../editor/EditorProvider'

/**
 * QR CODE — encodes a URL/text and places it on the canvas as an image.
 *
 * Rendered at 1024px with the highest error-correction level, so it stays
 * scannable when scaled up to a large print.
 */
export default function QrPanel({ onBack }) {
  const api = useEditorApi()
  const [value, setValue] = useState('')
  const [dark, setDark] = useState('#1b2333')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // live preview, debounced
  useEffect(() => {
    let alive = true
    if (!value.trim()) {
      setPreview(null)
      setErr('')
      return
    }
    const t = setTimeout(async () => {
      try {
        const QR = (await import('qrcode')).default
        const url = await QR.toDataURL(value.trim(), {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 1024,
          color: { dark, light: '#00000000' }, // transparent background
        })
        if (alive) {
          setPreview(url)
          setErr('')
        }
      } catch (e) {
        if (alive) {
          setPreview(null)
          setErr(e?.message || 'Could not generate that QR code')
        }
      }
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [value, dark])

  const addToCanvas = async () => {
    if (!preview) return
    setBusy(true)
    try {
      await api.canvas.current.addImage(preview)
      onBack()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ps-panel ps-qr">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        QR Code
      </button>

      <label className="ps-qr__field">
        <span>Link or text</span>
        <input
          type="text"
          value={value}
          placeholder="https://eventbesties.com"
          onChange={(e) => setValue(e.target.value)}
        />
      </label>

      <label className="ps-qr__field ps-qr__field--row">
        <span>Colour</span>
        <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} />
      </label>

      <div className="ps-qr__preview ps-checker">
        {preview ? (
          <img src={preview} alt="QR code preview" />
        ) : (
          <span className="ps-qr__hint">{err || 'Enter a link to preview'}</span>
        )}
      </div>

      <button
        type="button"
        className="ps-btn ps-btn--gold ps-qr__add"
        onClick={addToCanvas}
        disabled={!preview || busy}
      >
        {busy ? 'Adding…' : 'Add to design'}
      </button>
    </div>
  )
}
