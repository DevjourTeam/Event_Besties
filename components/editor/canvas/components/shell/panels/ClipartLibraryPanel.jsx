import { useEffect, useState } from 'react'
import { useEditorApi } from '../../../editor/EditorProvider'
import { CLIPARTS } from '../../../data/cliparts'
import { ALL_CLIPARTS, CLIPART_BASE } from '../../../data/clipartsAll'
import { fetchClipartCatalog } from '../../../editor/clipartCatalog'

const PAGE = 60
const PREVIEW = 6

const BackBtn = ({ label, onClick }) => (
  <button type="button" className="ps-panel__back" onClick={onClick}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
    {label}
  </button>
)

const Grid = ({ items, add }) => (
  <div className="ps-clipgrid">
    {items.map((it) => (
      <button key={it.id || it.src} type="button" className="ps-clipcell" onClick={() => add(it.src)}>
        <img src={it.src} alt="" draggable={false} loading="lazy" crossOrigin="anonymous" />
      </button>
    ))}
  </div>
)

export default function ClipartLibraryPanel({ onBack }) {
  const api = useEditorApi()
  const [catalog, setCatalog] = useState(null) // null=loading, []=none (fallback)
  const [view, setView] = useState('cats') // 'cats' | 'category' | 'all'
  const [activeCat, setActiveCat] = useState(null)
  const [shown, setShown] = useState(PAGE)

  useEffect(() => { fetchClipartCatalog().then(setCatalog) }, [])

  const add = (src) => api.canvas.current.addImage(src)

  if (catalog === null) {
    return (
      <div className="ps-panel ps-clipart">
        <BackBtn label="Back" onClick={onBack} />
        <p className="ps-fontlist__empty">Loading cliparts…</p>
      </div>
    )
  }

  const hasOwn = catalog.length > 0

  // ---------- OWN CATALOG: real per-category "More" ----------
  if (hasOwn) {
    if (view === 'category') {
      const cat = catalog.find((c) => c.category === activeCat)
      return (
        <div className="ps-panel ps-clipart">
          <BackBtn label={cat?.category || 'Cliparts'} onClick={() => setView('cats')} />
          <div className="ps-cliplist"><Grid items={cat?.items || []} add={add} /></div>
        </div>
      )
    }
    return (
      <div className="ps-panel ps-clipart">
        <BackBtn label="Back" onClick={onBack} />
        <div className="ps-cliplist">
          {catalog.map((c) => (
            <div className="ps-clipcat" key={c.category}>
              <div className="ps-clipcat__head">
                <h4 className="ps-clipcat__name">{c.category}</h4>
                {c.items.length > PREVIEW && (
                  <button type="button" className="ps-clipmore-link"
                    onClick={() => { setActiveCat(c.category); setView('category') }}>More</button>
                )}
              </div>
              <Grid items={c.items.slice(0, PREVIEW)} add={add} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---------- FALLBACK: built-in categories + full S3 browse ----------
  if (view === 'all') {
    return (
      <div className="ps-panel ps-clipart">
        <BackBtn label="All Cliparts" onClick={() => setView('cats')} />
        <div className="ps-cliplist">
          <Grid items={ALL_CLIPARTS.slice(0, shown).map((f) => ({ src: CLIPART_BASE + f }))} add={add} />
          {shown < ALL_CLIPARTS.length && (
            <button type="button" className="ps-clipmore" onClick={() => setShown((n) => n + PAGE)}>
              ↓ Load more ({ALL_CLIPARTS.length - shown} left)
            </button>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="ps-panel ps-clipart">
      <BackBtn label="Back" onClick={onBack} />
      <div className="ps-cliplist">
        {CLIPARTS.map((c) => (
          <div className="ps-clipcat" key={c.category}>
            <div className="ps-clipcat__head">
              <h4 className="ps-clipcat__name">{c.category}</h4>
              <button type="button" className="ps-clipmore-link" onClick={() => setView('all')}>More</button>
            </div>
            <Grid items={c.items} add={add} />
          </div>
        ))}
        <button type="button" className="ps-clipmore" onClick={() => setView('all')}>
          Browse all {ALL_CLIPARTS.length} cliparts →
        </button>
      </div>
    </div>
  )
}
