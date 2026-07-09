import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditorApi } from '../../../editor/EditorProvider'
import { loadFont } from '../../../utils/fontLoader'
import { GOOGLE_FONTS } from '../../../utils/googleFonts'

// de-duped master list
const ALL_FONTS = [...new Set(GOOGLE_FONTS.map((f) => f.trim()).filter(Boolean))].sort()

/**
 * Choose Font — 500+ Google fonts, lazy-loaded on scroll (one CSS request per
 * font only when its row scrolls into view), live preview, search, TTF upload.
 */
export default function FontPanel({ current, previewText, onPick, onBack }) {
  const api = useEditorApi()
  const [query, setQuery] = useState('')
  const [uploaded, setUploaded] = useState([])
  const initial = useRef(current)
  const fileRef = useRef(null)
  const listRef = useRef(null)
  const obsRef = useRef(null)
  const loaded = useRef(new Set())

  const all = useMemo(() => [...uploaded, ...ALL_FONTS], [uploaded])
  const list = useMemo(
    () => all.filter((f) => f.toLowerCase().includes(query.trim().toLowerCase())),
    [all, query]
  )

  // one shared observer that loads a font the first time its row is visible
  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const f = e.target.getAttribute('data-font')
          if (f && !loaded.current.has(f)) { loaded.current.add(f); loadFont(f) }
          obsRef.current.unobserve(e.target)
        })
      },
      { root: listRef.current, rootMargin: '300px' }
    )
    return () => obsRef.current?.disconnect()
  }, [])

  // (re)observe rows whenever the filtered list changes
  useEffect(() => {
    const obs = obsRef.current
    const root = listRef.current
    if (!obs || !root) return
    root.querySelectorAll('[data-font]').forEach((el) => {
      const f = el.getAttribute('data-font')
      if (!loaded.current.has(f)) obs.observe(el)
    })
  }, [list])

  const apply = (font) => {
    loaded.current.add(font)
    loadFont(font).then(() => {
      api.canvas.current.patchActive({ fontFamily: font })
      api.canvas.current.commit()
    })
    onPick(font)
  }

  const onUpload = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const name = file.name.replace(/\.[^.]+$/, '')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const face = new FontFace(name, reader.result)
        await face.load()
        document.fonts.add(face)
        setUploaded((u) => (u.includes(name) ? u : [name, ...u]))
        apply(name)
      } catch { /* ignore bad font */ }
    }
    reader.readAsArrayBuffer(file)
  }

  const preview = previewText?.trim() ? previewText : 'Abg'

  return (
    <div className="ps-panel ps-fontpanel">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Choose Font
      </button>

      <div className="ps-fontsearch">
        <i className="nxi nxi-zoom-in" aria-hidden="true" />
        <input value={query} placeholder="Search..." onChange={(e) => setQuery(e.target.value)} />
        {query && <button type="button" className="ps-fontsearch__x" onClick={() => setQuery('')}>×</button>}
        <span className="ps-fontsearch__filter" title="Filter">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 5h18l-7 8v6l-4-2v-4z" />
          </svg>
        </span>
      </div>

      <div className="ps-fontlist" ref={listRef}>
        {list.map((font) => (
          <button
            key={font}
            type="button"
            data-font={font}
            className={`ps-fontrow${current === font ? ' is-active' : ''}`}
            onClick={() => apply(font)}
          >
            <span className="ps-fontrow__preview" style={{ fontFamily: `"${font}"` }}>{preview}</span>
            <span className="ps-fontrow__name">{font}</span>
          </button>
        ))}
        {list.length === 0 && <p className="ps-fontlist__empty">No fonts match “{query}”.</p>}
      </div>

      <div className="ps-or ps-or--spaced"><span>OR</span></div>

      <div className="ps-fontupload-box">
        <button type="button" className="ps-btn ps-btn--gold" onClick={() => fileRef.current?.click()}>
          Upload Font
        </button>
        <span className="ps-fontupload__hint">Accepted File Type <span className="ps-chip">TTF</span></span>
        <input ref={fileRef} type="file" accept=".ttf,.otf,font/ttf" hidden onChange={onUpload} />
      </div>

      <div className="ps-adjust__btns">
        <button type="button" className="ps-btn ps-btn--dark" onClick={() => { apply(initial.current); onBack() }}>Cancel</button>
        <button type="button" className="ps-btn ps-btn--gold" onClick={onBack}>Done</button>
      </div>
    </div>
  )
}
