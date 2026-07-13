import { useRef, useState } from 'react'
import { useEditorApi } from '../../../editor/EditorProvider'

/**
 * QR CODE — pick what the code should do, fill in the data, optionally drop a
 * logo in the middle, then generate and place it on the canvas.
 *
 * Each type encodes the payload format scanners actually understand (SMSTO:,
 * vCard, MATMSG:, …) rather than just dumping text in.
 *
 * Rendered at 1024px with error-correction level H — the highest — so it stays
 * scannable both when blown up to a 2-metre board and with a logo covering the
 * centre.
 */
const TYPES = [
  {
    id: 'text',
    label: 'Text',
    hint: 'Display a plain text.',
    fields: [{ key: 'text', label: 'Add your text', placeholder: 'Enter text', multiline: true }],
    required: ['text'],
    build: (v) => v.text.trim(),
  },
  {
    id: 'sms',
    label: 'SMS',
    hint: 'Send an SMS with predefined text',
    fields: [
      { key: 'phone', label: 'Add your phone', placeholder: 'Enter phone' },
      { key: 'sms', label: 'Add your sms', placeholder: 'Enter text', multiline: true },
    ],
    required: ['phone'],
    build: (v) => `SMSTO:${v.phone.trim()}:${(v.sms || '').trim()}`,
  },
  {
    id: 'url',
    label: 'URL',
    hint: 'Open a URL after scanning the browser',
    fields: [{ key: 'url', label: 'Add your url', placeholder: 'Enter url' }],
    required: ['url'],
    build: (v) => {
      const u = v.url.trim()
      return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : `https://${u}`
    },
  },
  {
    id: 'contact',
    label: 'Contact',
    hint: 'Saves contact details on smartphone',
    fields: [
      { key: 'name', label: 'Add your name', placeholder: 'Enter name' },
      { key: 'email', label: 'Add your email', placeholder: 'Enter email' },
      { key: 'phone', label: 'Add your phone', placeholder: 'Enter phone' },
      { key: 'message', label: 'Add your message', placeholder: 'Enter message', multiline: true },
    ],
    required: ['name'],
    build: (v) =>
      [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${(v.name || '').trim()}`,
        v.phone ? `TEL:${v.phone.trim()}` : null,
        v.email ? `EMAIL:${v.email.trim()}` : null,
        v.message ? `NOTE:${v.message.trim()}` : null,
        'END:VCARD',
      ].filter(Boolean).join('\n'),
  },
  {
    id: 'email',
    label: 'Email',
    hint: 'send an email with predefined text',
    fields: [
      { key: 'email', label: 'Add your email', placeholder: 'Enter email' },
      { key: 'subject', label: 'Add your subject', placeholder: 'Enter subject' },
      { key: 'content', label: 'Add your content', placeholder: 'Enter message', multiline: true },
    ],
    required: ['email'],
    build: (v) =>
      `MATMSG:TO:${(v.email || '').trim()};SUB:${(v.subject || '').trim()};BODY:${(v.content || '').trim()};;`,
  },
]

const SIZE = 1024

export default function QrPanel({ onBack }) {
  const api = useEditorApi()
  const logoRef = useRef(null)

  const [typeId, setTypeId] = useState('text')
  const [values, setValues] = useState({})
  const [logo, setLogo] = useState(null) // data URL
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const type = TYPES.find((t) => t.id === typeId)
  const set = (key, v) => setValues((p) => ({ ...p, [key]: v }))
  const ready = type.required.every((k) => (values[k] || '').trim().length > 0)

  const onLogo = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogo(String(reader.result))
    reader.readAsDataURL(file)
  }

  const generate = async () => {
    if (!ready || busy) return
    setBusy(true)
    setErr('')
    try {
      const QR = (await import('qrcode')).default
      const payload = type.build(values)

      // Level H tolerates ~30% damage — that is what lets a logo sit in the
      // middle without breaking the code.
      const qrUrl = await QR.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: SIZE,
        color: { dark: '#000000', light: '#ffffff' },
      })

      const dataUrl = logo ? await compositeLogo(qrUrl, logo) : qrUrl
      await api.canvas.current.addImage(dataUrl)
      onBack()
    } catch (e) {
      setErr(e?.message || 'Could not generate that QR code')
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
        Back
      </button>

      <h3 className="ps-qr__h">Select QR code type</h3>
      <div className="ps-select">
        <select
          value={typeId}
          onChange={(e) => { setTypeId(e.target.value); setValues({}); setErr('') }}
        >
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <p className="ps-qr__hint">{type.hint}</p>

      <div className="ps-or ps-or--spaced"><span>ADD YOUR DATA</span></div>

      {type.fields.map((f) => (
        <label className="ps-qr__field" key={f.key}>
          <span>{f.label}</span>
          {f.multiline ? (
            <textarea
              rows={3}
              placeholder={f.placeholder}
              value={values[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <input
              type="text"
              placeholder={f.placeholder}
              value={values[f.key] || ''}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </label>
      ))}

      <div className="ps-or ps-or--spaced"><span>ADD LOGO</span></div>

      <div className="ps-qr__logo">
        <button type="button" className="ps-btn ps-btn--gold ps-qr__logobtn" onClick={() => logoRef.current?.click()}>
          Upload Logo
        </button>
        <p className="ps-qr__types">
          <strong>Accepted File Types:</strong> <span>JPEG, PNG JPG</span>
        </p>
        {logo && (
          <div className="ps-qr__logopreview">
            <img src={logo} alt="Logo" />
            <button type="button" className="ps-qr__logorm" onClick={() => setLogo(null)}>Remove</button>
          </div>
        )}
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          hidden
          onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = '' }}
        />
      </div>

      {err && <p className="ps-upload__error">{err}</p>}

      <button
        type="button"
        className="ps-btn ps-btn--gold ps-qr__add"
        onClick={generate}
        disabled={!ready || busy}
      >
        {busy ? 'Generating…' : 'Generate & Add'}
      </button>
    </div>
  )
}

/**
 * Draw the logo into the middle of the QR, on a white pad so the finder pattern
 * around it stays readable. Kept to 22% of the code, which level-H redundancy
 * comfortably absorbs.
 */
function compositeLogo(qrUrl, logoUrl) {
  return new Promise((resolve, reject) => {
    const qr = new Image()
    qr.onload = () => {
      const logo = new Image()
      logo.onload = () => {
        const c = document.createElement('canvas')
        c.width = SIZE
        c.height = SIZE
        const ctx = c.getContext('2d')
        ctx.drawImage(qr, 0, 0, SIZE, SIZE)

        const box = SIZE * 0.22
        const pad = box * 0.1
        const x = (SIZE - box) / 2
        const y = (SIZE - box) / 2

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y, box, box)

        // contain the logo inside the pad, keeping its aspect
        const iw = logo.naturalWidth || logo.width
        const ih = logo.naturalHeight || logo.height
        const inner = box - pad * 2
        const s = Math.min(inner / iw, inner / ih)
        const w = iw * s
        const h = ih * s
        ctx.drawImage(logo, x + (box - w) / 2, y + (box - h) / 2, w, h)

        resolve(c.toDataURL('image/png'))
      }
      logo.onerror = () => reject(new Error('Could not read that logo'))
      logo.src = logoUrl
    }
    qr.onerror = () => reject(new Error('Could not render the QR code'))
    qr.src = qrUrl
  })
}
