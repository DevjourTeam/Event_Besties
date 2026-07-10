'use client'

import { useEffect } from 'react'
import { useEditorState } from './editor/EditorProvider'

/**
 * Warns before the customer loses an in-progress design.
 *
 * Two escape routes have to be covered:
 *   1. Reloading / closing the tab  → native `beforeunload` dialog.
 *   2. Closing the storefront modal → embed.js owns the X button and the
 *      backdrop, and it lives on the parent page, so we post the dirty state
 *      up to it and let it show its own confirm.
 *
 * "Dirty" simply means the canvas has at least one object. Once the design has
 * been handed off (Process → cart), `disabled` turns the guard off so the
 * redirect to /cart isn't interrupted.
 */
export default function UnsavedGuard({ disabled = false }) {
  const { layers } = useEditorState()
  const dirty = !disabled && layers.length > 0

  useEffect(() => {
    // Tell the storefront wrapper (embed.js) whether there is work to lose.
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'EB_DIRTY', dirty }, '*')
      }
    } catch {
      /* cross-origin parent may reject — ignore */
    }

    if (!dirty) return
    const onBeforeUnload = (e) => {
      e.preventDefault()
      // Chrome requires returnValue to be set for the dialog to show.
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  return null
}
