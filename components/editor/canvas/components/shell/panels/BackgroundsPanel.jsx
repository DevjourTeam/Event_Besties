import { useRef, useState } from 'react'
import { useEditorState, useEditorApi } from '../../../editor/EditorProvider'
import { PATTERNS } from '../../../data/patterns'

/**
 * Background of the printable surface — colours or patterns.
 *
 * Drives doc.background, NOT canvas.backgroundColor: the Fabric canvas is
 * larger than the print area and transparent, so a colour set on it would paint
 * the workspace too. doc.background fills the shape on screen and is baked into
 * the export by renderPrint().
 *
 *   { type: 'color',   value }
 *   { type: 'pattern', src, fit: repeat|exact|scale, mode: brick|tile, spacing, size }
 *   { type: 'none' }
 *
 * A pattern defaults to fit=repeat at size 5, which is the image's ORIGINAL
 * pixel size — so it tiles rather than being stretched, and never blurs.
 */
const COLORS = [
  '#e6e6e6', '#f5a623', '#2e7d32', '#cbc09a', '#c9a227', '#b39b73',
  '#ffffff', '#000000', '#fde8ef', '#ec4899', '#e11d1d', '#d6ecfa',
  '#1e4f8a', '#e6d5f5', '#9b59d0', '#ffe000', '#a98b52', '#1b2333',
]

const PATTERN_DEFAULTS = { fit: 'repeat', mode: 'brick', spacing: 0, size: 5 }

export default function BackgroundsPanel({ onBack }) {
  const { doc } = useEditorState()
  const api = useEditorApi()
  const fileRef = useRef(null)

  const bg = doc.background || { type: 'none' }
  const [tab, setTab] = useState(bg.type === 'pattern' ? 'patterns' : 'colors')
  const [query, setQuery] = useState('')

  const setColor = (value) => api.patchDoc({ background: { type: 'color', value } })
  const clear = () => api.patchDoc({ background: { type: 'none', value: null } })

  const setPattern = (src) =>
    api.patchDoc({ background: { type: 'pattern', src, ...PATTERN_DEFAULTS } })

  // update one property of the active pattern
  const patchPattern = (patch) => {
    if (bg.type !== 'pattern') return
    api.patchDoc({ background: { ...bg, ...patch } })
  }

  const onUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPattern(String(reader.result))
    reader.readAsDataURL(file)
  }

  const patterns = PATTERNS.filter((p) =>
    query ? p.id.toLowerCase().includes(query.toLowerCase()) : true
  )
  const colors = COLORS.filter((c) =>
    query ? c.toLowerCase().includes(query.toLowerCase()) : true
  )

  return (
    <div className="ps-panel ps-bgpanel">
      <button type="button" className="ps-panel__back" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back
      </button>

      <input
        className="ps-bgsearch"
        type="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="ps-bgtabs">
        <button
          type="button"
          className={`ps-bgtab${tab === 'colors' ? ' is-active' : ''}`}
          onClick={() => setTab('colors')}
        >
          Colors
        </button>
        <button
          type="button"
          className={`ps-bgtab${tab === 'patterns' ? ' is-active' : ''}`}
          onClick={() => setTab('patterns')}
        >
          Patterns
        </button>
      </div>

      {tab === 'colors' ? (
        <>
          <div className="ps-bggrid">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                className={`ps-bgcell${bg.type === 'color' && bg.value === c ? ' is-active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
                aria-label={`Background ${c}`}
              />
            ))}
          </div>

          <div className="ps-or ps-or--spaced"><span>OR, CHOOSE FROM COLOR PICKER</span></div>

          <label className="ps-bgcustom">
            <span>Custom colour</span>
            <input
              type="color"
              value={bg.type === 'color' ? bg.value : '#ffffff'}
              onChange={(e) => setColor(e.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          <button
            type="button"
            className="ps-bgupload"
            onClick={() => fileRef.current?.click()}
          >
            <i className="nxi nxi-upload" aria-hidden="true" />
            Upload a pattern
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            hidden
            onChange={(e) => {
              onUpload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <p className="ps-upload__types-label">Accepted File Types</p>
          <div className="ps-chips">
            <span className="ps-chip">JPG</span>
            <span className="ps-chip">JPEG</span>
            <span className="ps-chip">PNG</span>
          </div>

          <div className="ps-or ps-or--spaced"><span>OR, CHOOSE FROM BELOW</span></div>

          <div className="ps-patgrid">
            {patterns.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ps-patcell${bg.type === 'pattern' && bg.src === p.full ? ' is-active' : ''}`}
                onClick={() => setPattern(p.full)}
                title={p.id}
              >
                <img src={p.thumb} alt={p.id} draggable={false} />
              </button>
            ))}
          </div>

          {/* fit controls appear once a pattern is chosen */}
          {bg.type === 'pattern' && (
            <div className="ps-patfit">
              <h3 className="ps-imgedit__h">Choose a fit</h3>

              <div className="ps-segmented">
                {[
                  { id: 'repeat', label: 'Repeat' },
                  { id: 'exact', label: 'Exact fit' },
                  { id: 'scale', label: 'Scale fit' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`ps-seg${(bg.fit || 'repeat') === f.id ? ' is-active' : ''}`}
                    onClick={() => patchPattern({ fit: f.id })}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* brick/tile + spacing + size only matter when repeating */}
              {(bg.fit || 'repeat') === 'repeat' && (
                <>
                  <div className="ps-radios">
                    {['brick', 'tile'].map((m) => (
                      <label key={m} className="ps-radio">
                        <input
                          type="radio"
                          name="ps-patmode"
                          checked={(bg.mode || 'brick') === m}
                          onChange={() => patchPattern({ mode: m })}
                        />
                        <span>{m === 'brick' ? 'Brick' : 'Tile'}</span>
                      </label>
                    ))}
                  </div>

                  <div className="ps-slider">
                    <div className="ps-slider__top"><label>Spacing</label></div>
                    <div className="ps-slider__row">
                      <input
                        type="range" min="0" max="80" step="1"
                        value={bg.spacing ?? 0}
                        onChange={(e) => patchPattern({ spacing: Number(e.target.value) })}
                      />
                      <input className="ps-slider__num" readOnly value={bg.spacing ?? 0} />
                    </div>
                  </div>

                  <div className="ps-slider">
                    <div className="ps-slider__top"><label>Size</label></div>
                    <div className="ps-slider__row">
                      <input
                        type="range" min="1" max="15" step="1"
                        value={bg.size ?? 5}
                        onChange={(e) => patchPattern({ size: Number(e.target.value) })}
                      />
                      <input className="ps-slider__num" readOnly value={bg.size ?? 5} />
                    </div>
                  </div>
                </>
              )}

              <div className="ps-adjust__btns">
                <button type="button" className="ps-btn ps-btn--dark" onClick={clear}>Cancel</button>
                <button type="button" className="ps-btn ps-btn--gold" onClick={onBack}>Done</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
