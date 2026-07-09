import { useState } from 'react'
import { useEditorState, useEditorApi } from '../../editor/EditorProvider'

const ZOOM_ITEMS = [
  { label: 'Fit to print area', mode: 'print' },
  { label: 'Fit to selection', mode: 'selection' },
  { label: 'Fit to designs', mode: 'designs' },
]

const EDIT_ITEMS = [
  { label: 'Clone', icon: 'copy', fn: 'clone' },
  { label: 'Forward Swap', icon: 'swap-forward', fn: 'bringForward' },
  { label: 'Backward Swap', icon: 'swap-backward', fn: 'sendBackward' },
  { label: 'Horizontal Align', icon: 'align-h', fn: 'alignH' },
  { label: 'Vertical Align', icon: 'align-v', fn: 'alignV' },
  { label: 'Flip Horizontal', icon: 'flip-h', fn: 'flipH' },
  { label: 'Flip Vertical', icon: 'flip-v', fn: 'flipV' },
]

export default function CanvasOverlayTools() {
  const { layers, selection, canUndo, canRedo } = useEditorState()
  const api = useEditorApi()
  const [menu, setMenu] = useState(null) // 'zoom' | 'edit' | null

  const hasObjects = layers.length > 0
  const hasSelection = selection.count > 0
  if (!hasObjects && !hasSelection) return null

  const call = (name, arg) => {
    api.canvas.current?.[name]?.(arg)
    setMenu(null)
  }

  return (
    <>
      {menu && <div className="ps-ovl__backdrop" onClick={() => setMenu(null)} />}

      {/* top-left: undo / redo */}
      {hasObjects && (
        <div className="ps-ovl ps-ovl--tl">
          <button
            type="button" className="ps-ovl__btn" title="Undo" disabled={!canUndo}
            onClick={() => call('undo')}
          >
            <i className="nxi nxi-undo" aria-hidden="true" />
          </button>
          <button
            type="button" className="ps-ovl__btn" title="Redo" disabled={!canRedo}
            onClick={() => call('redo')}
          >
            <i className="nxi nxi-redo" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* top-right: zoom + edit */}
      <div className="ps-ovl ps-ovl--tr">
        {hasObjects && (
          <div className="ps-ovl__stack">
            <button
              type="button"
              className={`ps-ovl__tool${menu === 'zoom' ? ' is-open' : ''}`}
              onClick={() => setMenu(menu === 'zoom' ? null : 'zoom')}
            >
              <i className="nxi nxi-zoom-in" aria-hidden="true" />
              <span>Zoom</span>
            </button>
            {menu === 'zoom' && (
              <div className="ps-ovl__menu ps-ovl__menu--plain">
                {ZOOM_ITEMS.map((z) => (
                  <button key={z.mode} type="button" className="ps-ovl__item"
                    onClick={() => call('zoomFit', z.mode)}>
                    {z.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasSelection && (
          <div className="ps-ovl__stack">
            <button
              type="button"
              className={`ps-ovl__tool${menu === 'edit' ? ' is-open' : ''}`}
              onClick={() => setMenu(menu === 'edit' ? null : 'edit')}
            >
              <span className="ps-ovl__dots" aria-hidden="true">
                <span /><span /><span />
              </span>
              <span>Edit</span>
            </button>
            {menu === 'edit' && (
              <div className="ps-ovl__menu">
                {EDIT_ITEMS.map((it) => (
                  <button key={it.fn} type="button" className="ps-ovl__item"
                    onClick={() => call(it.fn)}>
                    <i className={`nxi nxi-${it.icon}`} aria-hidden="true" />
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* bottom-left: clear all */}
      {hasObjects && (
        <div className="ps-ovl ps-ovl--bl">
          <button type="button" className="ps-ovl__clear" onClick={() => call('clearAll')}>
            <i className="nxi nxi-clear" aria-hidden="true" />
            Clear all
          </button>
        </div>
      )}
    </>
  )
}
