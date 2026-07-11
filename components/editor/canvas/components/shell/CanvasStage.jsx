import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { Canvas, IText, Rect, FabricImage, Path, Pattern, loadSVGFromURL, util as fabricUtil, filters as fabricFilters } from 'fabric'
import { useEditorState, useEditorApi } from '../../editor/EditorProvider'
import { buildShapePath } from '../../editor/shapes'
import { applyObjectControls, applyControlsToAll } from '../../editor/controls'
import CanvasOverlayTools from './CanvasOverlayTools'

/**
 * CanvasStage — the engine's viewport.
 *  - Fits a Fabric v7 canvas to its container, preserving the document's
 *    real-world aspect ratio (sizeCm).
 *  - Clips ALL content to the product shape (canvas.clipPath).
 *  - Draws the red cut-boundary + dimension overlays as a DOM SVG layer.
 *  - Registers imperative methods (addText/addImage/export/…) on the provider.
 */

// White margin between the print shape and the working-area edge. It must be
// larger than the floating corner tools (undo/redo, zoom, edit, clear-all),
// which sit 16px from the corner; the widest (zoom+edit stack) needs ~61px of
// clearance (16px offset + 45px width), so the margin must exceed that. This
// keeps every floating tool in the white gutter, never over the printable
// canvas or a design placed near a corner — matching the reference.
// Workspace margin INSIDE the Fabric canvas, surrounding the printable area.
// The Fabric canvas is (print + WORK_PAD*2); the print shape sits centred in it.
//
// This is what lets a customer hang an element off the print edge (bleed) while
// its selection controls still render inside the canvas and stay usable —
// anything outside the print shape is clipped on export.
//
// It doubles as the gutter the floating corner tools (undo/redo, zoom, edit,
// clear-all) live in: they need ~61px of clearance, and this margin is
// transparent, so they still never sit over the printable area.
const WORK_PAD = 90

// Keep an object's bounding box (plus room for its ~26px corner controls)
// within the canvas, so the controls are always reachable.
const CTRL_PAD = 26

export default function CanvasStage() {
  const { doc } = useEditorState()
  const api = useEditorApi()

  const wrapRef = useRef(null)
  const canvasElRef = useRef(null)
  const fabricRef = useRef(null)
  const dimLabelRef = useRef(null)
  // printable area in px (the Fabric canvas is this + WORK_PAD*2)
  const [box, setBox] = useState({ w: 0, h: 0 })

  // keep the latest doc reachable inside once-created Fabric event handlers
  const docRef = useRef(doc)
  docRef.current = doc
  // latest print size, for px<->cm maths inside the once-created handlers
  const printRef = useRef({ w: 0, h: 0 })

  // history (snapshots of canvas JSON)
  const undoStack = useRef([])
  const redoStack = useRef([])
  const restoringRef = useRef(false)
  const thumbTimer = useRef(null)
  // true while a scratch object is on the canvas for export — suppresses the
  // add/remove side effects (history, layers, thumbnail)
  const exportingRef = useRef(false)

  // ---- fit the printable area into the container, preserving doc aspect ----
  // The workspace margin is reserved on top, so the whole Fabric canvas fits.
  const computeFit = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return null
    const availW = wrap.clientWidth - WORK_PAD * 2
    const availH = wrap.clientHeight - WORK_PAD * 2
    if (availW <= 0 || availH <= 0) return null
    const aspect = doc.sizeCm.w / doc.sizeCm.h
    let w = availW
    let h = w / aspect
    if (h > availH) {
      h = availH
      w = h * aspect
    }
    return { w: Math.round(w), h: Math.round(h) }
  }, [doc.sizeCm.w, doc.sizeCm.h])

  // ---- create the Fabric canvas once ----
  useLayoutEffect(() => {
    const el = canvasElRef.current
    if (!el) return
    const fc = new Canvas(el, {
      preserveObjectStacking: true,
      selection: true,
      // Transparent: the canvas is larger than the print area, so a background
      // colour here would paint the workspace too. The printable surface is
      // drawn as a DOM layer beneath the canvas, and re-added at export time.
      backgroundColor: '',
      controlsAboveOverlay: true,
    })
    fabricRef.current = fc

    // px → cm for the active object, measured against the PRINT area (not the
    // larger canvas), so sizes stay truthful once elements can overflow.
    const objCm = (obj) => {
      const pw = printRef.current.w || 1
      const ph = printRef.current.h || 1
      const { w, h } = docRef.current.sizeCm
      return {
        wCm: obj.getScaledWidth() * (w / pw),
        hCm: obj.getScaledHeight() * (h / ph),
      }
    }

    // A crisp preview of the image's CURRENT state (crop + filters baked in).
    //
    // toDataURL renders the object at its ON-CANVAS size (scale included), so
    // the multiplier has to be derived from the scaled size — not the natural
    // width. Deriving it from the natural width produced a ~95px thumbnail for
    // an element sitting ~146px wide on the canvas, which the panel then had to
    // upscale (blurry). Target ~600px on the long edge instead.
    const imgThumb = (o) => {
      try {
        const longest = Math.max(o.getScaledWidth() || 1, o.getScaledHeight() || 1)
        const mult = Math.min(6, Math.max(1, 600 / longest))
        return o.toDataURL({ format: 'png', multiplier: mult, enableRetinaScaling: false })
      } catch {
        return o.getSrc?.() || o._element?.src || null
      }
    }
    // the untouched, full-resolution original source — used by the crop window
    const imgOrig = (o) => o.getSrc?.() || o._element?.src || null

    // Overflow IS allowed: an element may hang off the print boundary (bleed) —
    // anything outside the shape is simply clipped on export. What we must
    // guarantee is that the element's selection controls stay reachable, so we
    // clamp to the WORKSPACE (the whole Fabric canvas) rather than to the print
    // area, leaving CTRL_PAD so the corner handles are never cut off.
    const constrainObject = (obj) => {
      if (!obj || obj.__chrome) return
      const cw = fc.getWidth()
      const ch = fc.getHeight()
      const maxW = cw - CTRL_PAD * 2
      const maxH = ch - CTRL_PAD * 2
      // cap scale (uniform — resize keeps aspect) so the object still fits the
      // workspace; without this its handles would leave the canvas entirely.
      if (obj.width && obj.height) {
        const maxScale = Math.min(maxW / obj.width, maxH / obj.height)
        if (obj.scaleX > maxScale) obj.scaleX = maxScale
        if (obj.scaleY > maxScale) obj.scaleY = maxScale
      }
      obj.setCoords()
      const r = obj.getBoundingRect()
      let { left, top } = obj
      let moved = false
      if (r.left < CTRL_PAD) { left += CTRL_PAD - r.left; moved = true }
      if (r.top < CTRL_PAD) { top += CTRL_PAD - r.top; moved = true }
      if (r.left + r.width > cw - CTRL_PAD) { left += cw - CTRL_PAD - (r.left + r.width); moved = true }
      if (r.top + r.height > ch - CTRL_PAD) { top += ch - CTRL_PAD - (r.top + r.height); moved = true }
      if (moved) { obj.set({ left, top }); obj.setCoords() }
    }

    const updateDimLabel = () => {
      const el2 = dimLabelRef.current
      if (!el2) return
      const obj = fc.getActiveObject()
      if (!obj) { el2.style.display = 'none'; return }
      const r = obj.getBoundingRect()
      const { wCm, hCm } = objCm(obj)
      el2.textContent = `${wCm.toFixed(2)} cm x ${hCm.toFixed(2)} cm`
      el2.style.display = 'block'
      el2.style.left = `${r.left + r.width / 2}px`
      el2.style.top = `${r.top - 20}px`
    }

    const syncSelection = () => {
      const active = fc.getActiveObjects()
      const one = active.length === 1 ? active[0] : null
      const cm = one ? objCm(one) : { wCm: 0, hCm: 0 }
      const isImg = one && (one.__kind === 'image')
      api.setSelection({
        ids: active.map((o) => o.__id).filter(Boolean),
        kind: one ? one.__kind || one.type : active.length > 1 ? 'multi' : null,
        count: active.length,
        wCm: cm.wCm,
        hCm: cm.hCm,
        src: isImg ? imgThumb(one) : null,
        origSrc: isImg ? imgOrig(one) : null,
      })
      updateDimLabel()
    }
    const syncLayers = () => {
      const layers = fc
        .getObjects()
        .filter((o) => !o.__chrome)
        .map((o) => ({
          id: o.__id,
          type: o.__kind || o.type,
          name: o.__name || o.__kind || o.type,
          locked: !!o.lockMovementX,
          hidden: o.visible === false,
        }))
        .reverse() // top-most first
      api.setLayers(layers)
    }
    const pushHistory = () => {
      if (restoringRef.current) return
      undoStack.current.push(JSON.stringify(fc.toDatalessJSON(['__id', '__kind', '__name'])))
      if (undoStack.current.length > 60) undoStack.current.shift()
      redoStack.current = []
      api.setHistory(undoStack.current.length > 1, false)
    }

    /**
     * Render ONLY the printable area to a PNG.
     *
     * The Fabric canvas is larger than the print area (the workspace lets
     * elements overflow), so every export crops back to the print rect. The
     * canvas itself is transparent, so we temporarily drop in the printable
     * surface (the shape, filled) behind the art — giving a shaped PNG:
     * background inside the cut line, transparent outside it.
     */
    const renderPrint = ({ multiplier, maxEdge } = {}) => {
      const { w: pw, h: ph } = printRef.current
      if (!pw || !ph) return null
      const d = docRef.current

      let mult = multiplier
      if (mult == null) {
        const printPx = (d.sizeCm.w / 2.54) * d.dpi // real pixels at print DPI
        mult = printPx / pw
      }
      if (maxEdge) {
        const longest = Math.max(pw, ph) * mult
        if (longest > maxEdge) mult *= maxEdge / longest
      }

      const bg = new Path(buildShapePath(d.shape, pw, ph), {
        left: WORK_PAD,
        top: WORK_PAD,
        originX: 'left',
        originY: 'top',
        fill: d.background?.type === 'color' ? d.background.value : '#ffffff',
        selectable: false,
        evented: false,
      })
      bg.__chrome = true

      // Suppress the add/remove handlers so this scratch object never lands in
      // history, the layers list, or the thumbnail.
      exportingRef.current = true
      let url = null
      try {
        fc.insertAt(0, bg)
        url = fc.toDataURL({
          format: 'png',
          multiplier: mult,
          left: WORK_PAD,
          top: WORK_PAD,
          width: pw,
          height: ph,
        })
      } catch {
        url = null
      } finally {
        fc.remove(bg)
        exportingRef.current = false
        fc.requestRenderAll()
      }
      return url
    }

    // Live design preview for the bottom bar. Debounced + tiny (long edge
    // ~160px) so re-rendering it on every edit stays cheap.
    const syncThumb = () => {
      clearTimeout(thumbTimer.current)
      thumbTimer.current = setTimeout(() => {
        const hasArt = fc.getObjects().some((o) => !o.__chrome)
        if (!hasArt) return api.setThumb(null)
        const { w: pw, h: ph } = printRef.current
        const longest = Math.max(pw || 1, ph || 1)
        api.setThumb(renderPrint({ multiplier: Math.min(1, 160 / longest) }))
      }, 250)
    }

    fc.on('selection:created', syncSelection)
    fc.on('selection:updated', syncSelection)
    fc.on('selection:cleared', syncSelection)
    fc.on('object:added', () => {
      if (exportingRef.current) return
      syncLayers(); pushHistory(); syncThumb()
    })
    fc.on('object:removed', () => {
      if (exportingRef.current) return
      syncLayers(); pushHistory(); updateDimLabel(); syncThumb()
    })
    fc.on('object:modified', (e) => { constrainObject(e.target); pushHistory(); syncSelection(); syncThumb() })
    fc.on('text:changed', syncThumb)
    // live dimension label + boundary constraint while moving / scaling / rotating
    fc.on('object:moving', (e) => { constrainObject(e.target); updateDimLabel() })
    fc.on('object:scaling', (e) => { constrainObject(e.target); updateDimLabel() })
    fc.on('object:rotating', updateDimLabel)
    fc.on('after:render', () => { if (fc.getActiveObject()) updateDimLabel() })

    // ---------- imperative API exposed to the toolbar / bottom bar ----------
    const genId = () => 'o' + Math.random().toString(36).slice(2, 9)

    const placeCenter = (obj) => {
      obj.__id = genId()
      applyObjectControls(obj)
      fc.add(obj)
      fc.centerObject(obj)
      constrainObject(obj)
      fc.centerObject(obj)
      fc.setActiveObject(obj)
      fc.requestRenderAll()
    }

    api.registerCanvas({
      addText: (text = 'Your text', opts = {}) => {
        const t = new IText(text, {
          fontFamily: 'Jost, sans-serif',
          // sized against the PRINT area, not the larger workspace canvas
          fontSize: Math.round((printRef.current.h || 300) * 0.08),
          fill: '#1b2333',
          ...opts,
        })
        t.__kind = 'text'
        t.__name = 'Text'
        placeCenter(t)
        return t.__id
      },
      addShape: (kind = 'rect', opts = {}) => {
        const s = new Rect({ width: 120, height: 120, fill: '#a98b52', ...opts })
        s.__kind = 'shape'
        s.__name = 'Shape'
        placeCenter(s)
        return s.__id
      },
      addShapePath: (d, opts = {}) => {
        const p = new Path(d, {
          fill: '#1b2333',
          stroke: '#1b2333',
          strokeWidth: 0,
          strokeUniform: true, // keep border width constant when scaling
          ...opts,
        })
        const target = (printRef.current.w || 400) * 0.42
        p.scaleToWidth(target)
        p.__kind = 'shape'
        p.__name = 'Shape'
        placeCenter(p)
        return p.__id
      },
      addImage: async (url, opts = {}) => {
        let obj
        try {
          if (/\.svg(\?|$)/i.test(url)) {
            // SVG cliparts load as real vectors (crisp + always export cleanly)
            const res = await loadSVGFromURL(url)
            const objs = (res.objects || res || []).filter(Boolean)
            obj = fabricUtil.groupSVGElements(objs, res.options || {})
          } else {
            obj = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
          }
        } catch (e) {
          console.warn('[editor] addImage failed:', url, e?.message)
          return null
        }
        if (!obj) return null
        obj.set(opts)
        const maxW = (printRef.current.w || 300) * 0.6
        if (obj.getScaledWidth() > maxW) obj.scaleToWidth(maxW)
        obj.__kind = 'image'
        obj.__name = 'Image'
        placeCenter(obj)
        return obj.__id
      },
      setBackground: (value) => {
        fc.backgroundColor = value || '#ffffff'
        fc.requestRenderAll()
      },
      deleteSelected: () => {
        fc.getActiveObjects().forEach((o) => fc.remove(o))
        fc.discardActiveObject()
        fc.requestRenderAll()
      },
      undo: () => {
        if (undoStack.current.length < 2) return
        redoStack.current.push(undoStack.current.pop())
        const snap = undoStack.current[undoStack.current.length - 1]
        restoringRef.current = true
        fc.loadFromJSON(snap).then(() => {
          applyControlsToAll(fc)
          fc.requestRenderAll()
          restoringRef.current = false
          api.setHistory(undoStack.current.length > 1, redoStack.current.length > 0)
        })
      },
      redo: () => {
        if (!redoStack.current.length) return
        const snap = redoStack.current.pop()
        undoStack.current.push(snap)
        restoringRef.current = true
        fc.loadFromJSON(snap).then(() => {
          applyControlsToAll(fc)
          fc.requestRenderAll()
          restoringRef.current = false
          api.setHistory(undoStack.current.length > 1, redoStack.current.length > 0)
        })
      },
      // Renders the printable area at print DPI, cropping away the workspace.
      // opts.maxEdge caps the longest edge (used when POSTing to the export API
      // so the base64 body stays under serverless limits).
      exportPNG: async (opts = {}) => renderPrint({ maxEdge: opts.maxEdge }),
      exportPDF: async () => {
        console.warn('exportPDF: not wired yet (Phase: export). Returns PNG for now.')
        return api.canvas.current.exportPNG()
      },

      // ---------- stacking / arrange ----------
      clone: async () => {
        const o = fc.getActiveObject()
        if (!o) return
        const cl = await o.clone(['__kind', '__name', '__adjust', '__colorMode', '__preset'])
        cl.set({ left: (o.left || 0) + 24, top: (o.top || 0) + 24 })
        cl.__id = genId()
        fc.add(cl)
        fc.setActiveObject(cl)
        fc.requestRenderAll()
      },
      bringForward: () => {
        const o = fc.getActiveObject(); if (!o) return
        fc.bringObjectForward(o); fc.requestRenderAll(); pushHistory(); syncLayers()
      },
      sendBackward: () => {
        const o = fc.getActiveObject(); if (!o) return
        fc.sendObjectBackwards(o); fc.requestRenderAll(); pushHistory(); syncLayers()
      },
      alignH: () => {
        const o = fc.getActiveObject(); if (!o) return
        fc.centerObjectH(o); o.setCoords(); fc.requestRenderAll(); pushHistory(); syncSelection()
      },
      alignV: () => {
        const o = fc.getActiveObject(); if (!o) return
        fc.centerObjectV(o); o.setCoords(); fc.requestRenderAll(); pushHistory(); syncSelection()
      },
      flipH: () => {
        const o = fc.getActiveObject(); if (!o) return
        o.set('flipX', !o.flipX); fc.requestRenderAll(); pushHistory()
      },
      flipV: () => {
        const o = fc.getActiveObject(); if (!o) return
        o.set('flipY', !o.flipY); fc.requestRenderAll(); pushHistory()
      },

      // ---------- clear / zoom ----------
      clearAll: () => {
        fc.getObjects().filter((o) => !o.__chrome).forEach((o) => fc.remove(o))
        fc.discardActiveObject(); fc.requestRenderAll(); updateDimLabel()
      },
      zoomFit: (mode) => {
        fc.setViewportTransform([1, 0, 0, 1, 0, 0])
        let rect = null
        if (mode === 'selection') {
          const o = fc.getActiveObject(); if (o) rect = o.getBoundingRect()
        } else if (mode === 'designs') {
          rect = unionRect(fc.getObjects().filter((o) => !o.__chrome))
        }
        if (rect && rect.width && rect.height) {
          const cw = fc.getWidth(), ch = fc.getHeight()
          const zoom = Math.min(cw / rect.width, ch / rect.height) * 0.85
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          fc.setViewportTransform([zoom, 0, 0, zoom, cw / 2 - cx * zoom, ch / 2 - cy * zoom])
        }
        fc.requestRenderAll(); updateDimLabel()
      },

      // ---------- image color / adjustments ----------
      setColorMode: (mode) => {
        const o = fc.getActiveObject()
        if (!o || o.__kind !== 'image') return
        o.__colorMode = mode
        rebuildImageFilters(o); pushHistory()
      },
      applyAdjustments: (values) => {
        const o = fc.getActiveObject()
        if (!o || o.__kind !== 'image') return
        o.__adjust = { ...(o.__adjust || {}), ...values }
        rebuildImageFilters(o)
      },
      setFilterPreset: (id) => {
        const o = fc.getActiveObject()
        if (!o || o.__kind !== 'image') return
        o.__preset = id
        rebuildImageFilters(o)
      },
      getPreset: () => {
        const o = fc.getActiveObject()
        return (o && o.__kind === 'image' && o.__preset) || 'original'
      },
      cropSelected: ({ rx, ry, rw, rh }) => {
        const o = fc.getActiveObject()
        if (!o || o.__kind !== 'image') return
        const el = o._element || o.getElement?.()
        const natW = el?.naturalWidth || o.width
        const natH = el?.naturalHeight || o.height
        o.set({
          cropX: Math.max(0, rx * natW),
          cropY: Math.max(0, ry * natH),
          width: Math.max(1, rw * natW),
          height: Math.max(1, rh * natH),
        })
        o.setCoords(); fc.requestRenderAll(); pushHistory(); syncSelection()
      },
      commitAdjustments: () => pushHistory(),
      getAdjust: () => {
        const o = fc.getActiveObject()
        return (o && o.__kind === 'image' && o.__adjust) || {}
      },

      // ---------- resize active object to a real-world size ----------
      resizeSelectedCm: (wCm, hCm, lockAspect) => {
        const o = fc.getActiveObject()
        if (!o) return
        // cm maps to the PRINT area, not the larger workspace canvas
        const pw = printRef.current.w || 1
        const ph = printRef.current.h || 1
        const { w, h } = docRef.current.sizeCm
        const sx = ((wCm * pw) / w) / o.width
        o.scaleX = sx
        o.scaleY = lockAspect ? sx : ((hCm * ph) / h) / o.height
        o.setCoords(); fc.requestRenderAll(); pushHistory(); syncSelection()
      },

      // ---------- generic active-object editing (text, etc.) ----------
      patchActive: (props) => {
        const o = fc.getActiveObject()
        if (!o) return
        o.set(props)
        o.setCoords()
        constrainObject(o) // auto-shrink text that grew past the boundary
        fc.requestRenderAll()
        updateDimLabel()
      },
      commit: () => pushHistory(),
      setActiveById: (id) => {
        const o = fc.getObjects().find((x) => x.__id === id)
        if (o && fc.getActiveObject() !== o) {
          fc.setActiveObject(o)
          fc.requestRenderAll()
        }
        return !!o
      },
      deselect: () => {
        fc.discardActiveObject()
        fc.requestRenderAll()
        syncSelection()
      },
      getActiveProps: () => {
        const o = fc.getActiveObject()
        if (!o) return null
        return {
          text: o.text,
          fontFamily: o.fontFamily,
          fontSize: o.fontSize,
          charSpacing: o.charSpacing,
          fill: o.fill,
          stroke: o.stroke,
          strokeWidth: o.strokeWidth,
          textAlign: o.textAlign,
          width: o.width,
          height: o.height,
        }
      },
      // fill the active object with a texture image (glitter/foil/pattern)
      setPatternFill: async (url) => {
        const o = fc.getActiveObject()
        if (!o) return
        try {
          const imgEl = await fabricUtil.loadImage(url, { crossOrigin: 'anonymous' })
          const pattern = new Pattern({ source: imgEl, repeat: 'repeat' })
          o.set('fill', pattern)
          fc.requestRenderAll()
          pushHistory()
        } catch {
          /* image failed to load — leave fill unchanged */
        }
      },
      // text-on-path warp: pass an SVG path string, or null to reset to plain
      setTextPath: (pathStr) => {
        const o = fc.getActiveObject()
        if (!o) return
        if (!pathStr) {
          o.set({ path: undefined })
        } else {
          const p = new Path(pathStr, { fill: '', stroke: '', visible: false })
          o.set({ path: p, pathAlign: 'center', pathSide: 'left' })
        }
        o.setCoords(); fc.requestRenderAll(); pushHistory(); syncSelection()
      },

      save: async () => api.canvas.current.exportPNG(),
      getCanvas: () => fc,
    })

    // union bounding rect of a set of objects (vpt assumed identity)
    function unionRect(objs) {
      if (!objs.length) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      objs.forEach((o) => {
        const r = o.getBoundingRect()
        minX = Math.min(minX, r.left); minY = Math.min(minY, r.top)
        maxX = Math.max(maxX, r.left + r.width); maxY = Math.max(maxY, r.top + r.height)
      })
      return { left: minX, top: minY, width: maxX - minX, height: maxY - minY }
    }

    // preset filter stacks (must match FilterPanel ids)
    function buildPreset(id) {
      const F = fabricFilters
      switch (id) {
        case 'sepia': return [new F.Sepia()]
        case 'bright': return [new F.Brightness({ brightness: 0.18 })]
        case 'pink': return [new F.BlendColor({ color: '#ff5fa2', mode: 'tint', alpha: 0.4 })]
        case 'blue': return [new F.BlendColor({ color: '#5b6cff', mode: 'tint', alpha: 0.4 })]
        case 'cool': return [new F.HueRotation({ rotation: 0.18 }), new F.Saturation({ saturation: 0.2 })]
        case 'vintage': return [new F.Sepia(), new F.Contrast({ contrast: 0.15 })]
        case 'green': return [new F.BlendColor({ color: '#37b24d', mode: 'tint', alpha: 0.4 })]
        case 'bw': return [new F.Grayscale(), new F.Contrast({ contrast: 0.25 })]
        default: return []
      }
    }

    // rebuild an image object's filter stack from adjust values + color mode + preset
    function rebuildImageFilters(o) {
      const a = o.__adjust || {}
      const fs = []
      if (a.brightness) fs.push(new fabricFilters.Brightness({ brightness: a.brightness / 100 }))
      if (a.contrast) fs.push(new fabricFilters.Contrast({ contrast: a.contrast / 100 }))
      if (a.saturation) fs.push(new fabricFilters.Saturation({ saturation: a.saturation / 100 }))
      if (a.hue) fs.push(new fabricFilters.HueRotation({ rotation: a.hue / 100 }))
      if (a.blur) fs.push(new fabricFilters.Blur({ blur: a.blur / 100 }))
      if (o.__colorMode === 'grayscale') fs.push(new fabricFilters.Grayscale())
      if (o.__colorMode === 'bw') fs.push(new fabricFilters.BlackWhite())
      fs.push(...buildPreset(o.__preset))
      o.filters = fs
      o.applyFilters()
      fc.requestRenderAll()
    }

    // keyboard: delete / undo / redo
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (fc.getActiveObject()?.isEditing) return
        api.canvas.current.deleteSelected()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? api.canvas.current.redo() : api.canvas.current.undo()
      }
    }
    window.addEventListener('keydown', onKey)

    // seed initial history snapshot
    undoStack.current = [JSON.stringify(fc.toDatalessJSON(['__id', '__kind', '__name']))]

    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(thumbTimer.current)
      fc.dispose()
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- responsive: observe container, recompute fit ----
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const apply = () => {
      const fit = computeFit()
      if (fit) setBox(fit)
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [computeFit])

  // ---- apply size + clip whenever box or doc changes ----
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !box.w || !box.h) return

    const prevPrintW = printRef.current.w || box.w
    const ratio = box.w / prevPrintW
    printRef.current = { w: box.w, h: box.h }

    // The Fabric canvas is the print area PLUS the workspace margin, so an
    // element can overflow the print edge and still show its controls.
    const cw = box.w + WORK_PAD * 2
    const ch = box.h + WORK_PAD * 2
    const prevCx = (fc.getWidth() || cw) / 2
    const prevCy = (fc.getHeight() || ch) / 2

    fc.setDimensions({ width: cw, height: ch })

    // Rescale existing objects around the canvas centre (which is also the
    // print-area centre, since the margin is symmetric).
    if (ratio !== 1 && Number.isFinite(ratio)) {
      const cx = cw / 2
      const cy = ch / 2
      fc.getObjects().forEach((o) => {
        o.scaleX *= ratio
        o.scaleY *= ratio
        o.left = cx + (o.left - prevCx) * ratio
        o.top = cy + (o.top - prevCy) * ratio
        o.setCoords()
      })
    }

    // Clip the artwork to the product shape, offset into the workspace. The
    // overflow outside the shape is hidden on screen and cropped on export.
    const pathStr = buildShapePath(doc.shape, box.w, box.h)
    fc.clipPath = new Path(pathStr, {
      absolutePositioned: true,
      left: WORK_PAD,
      top: WORK_PAD,
      originX: 'left',
      originY: 'top',
    })

    // Canvas stays transparent — the printable surface is the DOM layer below,
    // and it is re-created for the export in renderPrint().
    fc.backgroundColor = ''

    fc.requestRenderAll()
  }, [box.w, box.h, doc.shape, doc.background])

  // ---- dimension + boundary overlay path (DOM SVG, non-interactive) ----
  const overlayPath = box.w && box.h ? buildShapePath(doc.shape, box.w, box.h) : ''

  // The Fabric canvas (workspace) is the print area plus a margin on each side.
  const canvasW = box.w ? box.w + WORK_PAD * 2 : 0
  const canvasH = box.h ? box.h + WORK_PAD * 2 : 0
  // Overlays that belong to the print area sit inset by the workspace margin.
  const printAreaStyle = {
    left: WORK_PAD,
    top: WORK_PAD,
    width: box.w,
    height: box.h,
  }
  const surfaceFill =
    doc.background?.type === 'color' ? doc.background.value : '#ffffff'

  return (
    <div className="ps-canvas-wrap" ref={wrapRef}>
      <CanvasOverlayTools />
      <div className="ps-canvas-host" style={{ width: canvasW, height: canvasH }}>
        {/* product mockup photo behind everything (when a product provides one) */}
        {doc.mockup && (
          <img className="ps-mockup" src={doc.mockup} alt="" draggable={false} />
        )}

        {/* the printable surface, BELOW the canvas. The canvas itself is
            transparent, so this is what makes the print area read as "the
            product" while the surrounding workspace stays empty. */}
        {overlayPath && (
          <div className="ps-print-area" style={printAreaStyle}>
            <svg
              className="ps-surface-layer"
              width={box.w}
              height={box.h}
              viewBox={`0 0 ${box.w} ${box.h}`}
            >
              <path d={overlayPath} className="ps-shape-surface" fill={surfaceFill} />
            </svg>
          </div>
        )}

        {/* the live Fabric canvas — kept in its OWN wrapper so React never
            inserts sibling overlays around the node Fabric relocates */}
        <div className="ps-fabric-holder">
          <canvas ref={canvasElRef} width={canvasW} height={canvasH} />
          <div className="ps-dim-tag" ref={dimLabelRef} style={{ display: 'none' }} />
        </div>

        {/* boundary + dimension guides ABOVE the canvas (non-interactive) */}
        {overlayPath && (
          <div className="ps-print-area ps-print-area--top" style={printAreaStyle}>
            <DimensionOverlay
              w={box.w}
              h={box.h}
              path={overlayPath}
              widthCm={doc.sizeCm.w}
              heightCm={doc.sizeCm.h}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/** Red cut-line + cm dimension guides, drawn over the canvas. */
function DimensionOverlay({ w, h, path, widthCm, heightCm }) {
  return (
    <svg
      className="ps-dim-overlay"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 2,
      }}
    >
      {/* red print / cut boundary */}
      <path d={path} fill="none" stroke="#e0563b" strokeWidth="1.5" />

      {/* width guide (top) */}
      <line x1="0" y1="-16" x2={w} y2="-16" stroke="#b4b8c0" strokeWidth="1" />
      <line x1="0" y1="-20" x2="0" y2="-12" stroke="#b4b8c0" strokeWidth="1" />
      <line x1={w} y1="-20" x2={w} y2="-12" stroke="#b4b8c0" strokeWidth="1" />
      <foreignObject x={w / 2 - 50} y="-29" width="100" height="20">
        <div className="ps-dim-label">{widthCm.toFixed(2)} cm</div>
      </foreignObject>

      {/* height guide (left) */}
      <line x1="-16" y1="0" x2="-16" y2={h} stroke="#b4b8c0" strokeWidth="1" />
      <line x1="-20" y1="0" x2="-12" y2="0" stroke="#b4b8c0" strokeWidth="1" />
      <line x1="-20" y1={h} x2="-12" y2={h} stroke="#b4b8c0" strokeWidth="1" />
      <foreignObject x="-40" y={h / 2 - 52} width="24" height="104">
        <div className="ps-dim-label ps-dim-label--v">{heightCm.toFixed(2)} cm</div>
      </foreignObject>
    </svg>
  )
}
