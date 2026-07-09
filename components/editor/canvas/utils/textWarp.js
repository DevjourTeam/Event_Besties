// textWarp.js
// Approach: render text to off-screen canvas using browser's native font rendering,
// then apply backward-mapped pixel warp. No font file fetching — works with all fonts.

export const WARP_PRESETS = [
  { id: 'straight',          label: 'Straight' },
  { id: 'wave',              label: 'Wave' },
  { id: 'squeeze',           label: 'Squeeze' },
  { id: 'bridge-down',       label: 'Bridge Down' },
  { id: 'pinch',             label: 'Pinch' },
  { id: 'bulge',             label: 'Bulge' },
  { id: 'arch-up-small',     label: 'Arch Up Small' },
  { id: 'bridge-up',         label: 'Bridge Up' },
  { id: 'arch-down',         label: 'Arch Down' },
  { id: 'arc-up-large',      label: 'Arc Up' },
  { id: 'flag',              label: 'Flag' },
  { id: 'perspective-left',  label: 'Perspective' },
  { id: 'arch-steep',        label: 'Arch Steep' },
  { id: 'diamond',           label: 'Diamond' },
  { id: 'pinch-top',         label: 'Pinch Top' },
  { id: 'pinch-bottom',      label: 'Pinch Bottom' },
  { id: 'bulge-horizontal',  label: 'Bulge Horizontal' },
  { id: 'lens',              label: 'Lens' },
  { id: 'circle',            label: 'Circle' },
]

// ---------------------------------------------------------------------------
// Inverse (backward) warp functions.
// Given a destination pixel at (dx, oy) — where oy is in the original H
// coordinate space (can be negative in the overhead padding region) — return
// the source pixel (sx, sy) that should map there.
// All functions receive (W, H, strength) as closure variables.
// ---------------------------------------------------------------------------
function getInverseTransformFn(warpId, W, H, strength) {
  const s = strength  // 0..1

  switch (warpId) {
    case 'wave': {
      const amp = s * H * 0.4
      return (dx, oy) => [dx, oy - amp * Math.sin((dx / W) * Math.PI * 2)]
    }

    case 'squeeze': {
      const sm = s * 0.5
      const midY = H / 2
      return (dx, oy) => {
        const normalized = dx / W - 0.5
        const scale = 1 - sm * (1 - Math.abs(normalized) * 2)
        const safe = Math.abs(scale) < 0.01 ? (scale < 0 ? -0.01 : 0.01) : scale
        return [dx, midY + (oy - midY) / safe]
      }
    }

    case 'bridge-down': {
      const amp = s * H * 0.6
      return (dx, oy) => {
        const n = (dx / W - 0.5) * 2
        return [dx, oy - amp * n * n]
      }
    }

    case 'pinch': {
      const sm = s * 0.6
      const midY = H / 2
      return (dx, oy) => {
        const normalized = Math.abs(dx / W - 0.5) * 2
        const factor = 1 - sm * (1 - normalized)
        const safe = Math.abs(factor) < 0.01 ? (factor < 0 ? -0.01 : 0.01) : factor
        return [dx, midY + (oy - midY) / safe]
      }
    }

    case 'bulge': {
      const sm = s * 0.6
      const midY = H / 2
      return (dx, oy) => {
        const normalized = 1 - Math.abs(dx / W - 0.5) * 2
        const factor = 1 + sm * normalized
        const safe = Math.abs(factor) < 0.01 ? 0.01 : factor
        return [dx, midY + (oy - midY) / safe]
      }
    }

    case 'arch-up-small': {
      const amp = s * H * 0.5
      return (dx, oy) => [dx, oy + amp * Math.cos((dx / W - 0.5) * Math.PI)]
    }

    case 'bridge-up': {
      const amp = s * H * 0.6
      return (dx, oy) => {
        const n = (dx / W - 0.5) * 2
        return [dx, oy + amp * (1 - n * n)]
      }
    }

    case 'arch-down': {
      const amp = s * H * 0.5
      return (dx, oy) => [dx, oy - amp * Math.cos((dx / W - 0.5) * Math.PI)]
    }

    case 'arc-up-large': {
      const amp = s * H * 0.8
      return (dx, oy) => {
        const angle = (dx / W - 0.5) * Math.PI
        return [dx, oy + amp * Math.cos(angle) * (1 - Math.abs(angle) / Math.PI)]
      }
    }

    case 'flag': {
      return (dx, oy) => {
        const sinVal = Math.sin((dx / W) * Math.PI * 1.5)
        const factor = 1 + s * 0.35 * sinVal
        const safe = Math.abs(factor) < 0.01 ? (factor < 0 ? -0.01 : 0.01) : factor
        return [dx, oy / safe]
      }
    }

    case 'perspective-left': {
      const sm = s * 0.5
      const midY = H / 2
      return (dx, oy) => {
        const factor = 1 - sm * (1 - dx / W)
        const safe = Math.abs(factor) < 0.01 ? (factor < 0 ? -0.01 : 0.01) : factor
        return [dx, midY + (oy - midY) / safe]
      }
    }

    case 'arch-steep': {
      const amp = s * H * 1.0
      return (dx, oy) => [dx, oy + amp * Math.sin((dx / W) * Math.PI)]
    }

    case 'diamond': {
      // Forward: x' = x + s*H*0.5*ny*nx, y' = y + s*H*0.5*nx²*sign(ny)
      // Non-linear in both axes — use iterative refinement (8 passes)
      const sm = s * H * 0.5
      return (dx, oy) => {
        let sx = dx, sy = oy
        for (let i = 0; i < 8; i++) {
          const nx = (sx / W - 0.5) * 2
          const ny = (sy / H - 0.5) * 2
          sx = dx - sm * ny * nx
          sy = oy - sm * nx * nx * Math.sign(ny)
        }
        return [sx, sy]
      }
    }

    case 'pinch-top': {
      // Forward: x' = x + s*0.6 * (x-W/2) * (1-y/H) * 0.5, y' = y
      // Inverse: sx = (dx + k*W/2) / (1+k),  where k = s*0.6*(1-oy/H)*0.5
      const sm = s * 0.6
      return (dx, oy) => {
        const k = sm * (1 - oy / H) * 0.5
        const denom = 1 + k
        return [(dx + (W / 2) * k) / denom, oy]
      }
    }

    case 'pinch-bottom': {
      // Forward: x' = x + s*0.6 * (x-W/2) * (y/H) * 0.5, y' = y
      const sm = s * 0.6
      return (dx, oy) => {
        const k = sm * (oy / H) * 0.5
        const denom = 1 + k
        return [(dx + (W / 2) * k) / denom, oy]
      }
    }

    case 'bulge-horizontal': {
      const amp = s * H * 0.4
      return (dx, oy) => {
        const nx = (dx / W - 0.5) * 2
        const offset = amp * (1 - nx * nx) * Math.sign(oy - H / 2) * 0.5
        return [dx, oy - offset]
      }
    }

    case 'lens': {
      const amp = s * H * 0.5
      const midY = H / 2
      return (dx, oy) => {
        const nx = (dx / W - 0.5) * 2
        const curve = 1 - nx * nx
        const factor = 1 + (amp / H) * curve
        const safe = Math.abs(factor) < 0.01 ? 0.01 : factor
        return [dx, midY + (oy - midY) / safe]
      }
    }

    case 'circle': {
      // Forward maps text onto a circular arc.
      // Inverse: unproject from the circle back to the flat source.
      const sm = Math.max(s, 0.01)
      const radius = (W / (2 * Math.PI)) * (2 - sm * 0.5)
      return (dx, oy) => {
        const cx = dx - W / 2
        const cy = -(oy - H / 2 - radius)
        const dist = Math.sqrt(cx * cx + cy * cy)
        const angle = Math.atan2(cx, cy)
        const sx = (angle / (Math.PI * 2 * sm) + 0.5) * W
        const sy = (dist - radius) + H / 2
        return [sx, sy]
      }
    }

    default:
      return (dx, oy) => [dx, oy]
  }
}

// Crop a canvas to the tightest bounding box of non-transparent pixels.
function cropToContent(canvas) {
  const ctx = canvas.getContext('2d')
  const { width: W, height: H } = canvas
  const data = ctx.getImageData(0, 0, W, H).data
  let minX = W, maxX = 0, minY = H, maxY = 0

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (minX > maxX || minY > maxY) return canvas  // nothing visible

  const PAD = 6
  minX = Math.max(0, minX - PAD)
  minY = Math.max(0, minY - PAD)
  maxX = Math.min(W - 1, maxX + PAD)
  maxY = Math.min(H - 1, maxY + PAD)

  const cw = maxX - minX
  const ch = maxY - minY
  if (cw <= 0 || ch <= 0) return canvas

  const out = document.createElement('canvas')
  out.width  = cw
  out.height = ch
  out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch)
  return out
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export async function applyWarpToText(canvas, fabricTextObj, warpId, strength, saveState) {
  const fabric = window.fabric
  if (!fabric) throw new Error('Fabric.js is not loaded.')

  // ── Restore to plain IText ───────────────────────────────────────────────
  if (warpId === 'straight') {
    const source = fabricTextObj._warpSource
    if (source) {
      const restored = new fabric.IText(source.text, {
        left:       source.left,
        top:        source.top,
        fontFamily: source.fontFamily,
        fontSize:   source.fontSize,
        fill:       source.fill,
        fontWeight: source.fontWeight || 'normal',
        fontStyle:  source.fontStyle  || 'normal',
        originX:    'center',
        originY:    'center',
      })
      canvas.remove(fabricTextObj)
      canvas.add(restored)
      canvas.setActiveObject(restored)
      canvas.renderAll()
      saveState(canvas)
    }
    return
  }

  // ── Gather source text properties ────────────────────────────────────────
  const isAlreadyWarped = fabricTextObj._isWarpedText === true
  const source = isAlreadyWarped
    ? {
        // Spread stored source properties (text, font, size, color, etc.)
        // but use the object's CURRENT canvas position so re-applying
        // warp for an edit doesn't snap the image back to its original spot.
        ...fabricTextObj._warpSource,
        left: fabricTextObj.left,
        top:  fabricTextObj.top,
      }
    : {
        text:        fabricTextObj.text,
        fontFamily:  fabricTextObj.fontFamily  || 'Arial',
        fontSize:    fabricTextObj.fontSize    || 36,
        fill:        fabricTextObj.fill        || '#000000',
        fontWeight:  fabricTextObj.fontWeight  || 'normal',
        fontStyle:   fabricTextObj.fontStyle   || 'normal',
        charSpacing: fabricTextObj.charSpacing || 0,
        left:        fabricTextObj.left,
        top:         fabricTextObj.top,
      }

  if (!source.text || source.text.trim() === '') {
    throw new Error('Please add some text before applying effects.')
  }

  // ── Step 1: Ensure the web font is loaded ────────────────────────────────
  const { fontFamily, fontSize, fontWeight, fontStyle } = source
  const fontSpec = [
    fontStyle  !== 'normal' ? fontStyle  : '',
    fontWeight !== 'normal' ? fontWeight : '',
    `${fontSize}px`,
    `"${fontFamily}"`,
  ].filter(Boolean).join(' ')

  if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
    try { await document.fonts.load(fontSpec) } catch (_) { /* ignore */ }
  }

  // ── Step 2: Render text to off-screen canvas at 2× ──────────────────────
  const SCALE  = 2
  const srcEl  = document.createElement('canvas')
  const srcCtx = srcEl.getContext('2d')

  const fontStr = [
    fontStyle  !== 'normal' ? fontStyle  : '',
    fontWeight !== 'normal' ? fontWeight : '',
    `${fontSize * SCALE}px`,
    `"${fontFamily}"`,
  ].filter(Boolean).join(' ')

  // Apply letter spacing before measuring (supported in Chrome 94+, Firefox 101+)
  const charSpacing = source.charSpacing || 0
  if ('letterSpacing' in srcCtx) {
    srcCtx.letterSpacing = `${(charSpacing / 1000) * fontSize * SCALE}px`
  }

  srcCtx.font = fontStr
  const metrics  = srcCtx.measureText(source.text)
  const textW    = Math.ceil(metrics.width)
  const textH    = Math.ceil(fontSize * SCALE * 1.6)
  const PAD_X    = Math.max(20, Math.ceil(textW * 0.05))
  const PAD_Y    = Math.max(20, Math.ceil(textH * 0.15))

  srcEl.width  = textW + PAD_X * 2
  srcEl.height = textH + PAD_Y * 2

  // Re-set font + letterSpacing after canvas resize (resize clears context state)
  if ('letterSpacing' in srcCtx) {
    srcCtx.letterSpacing = `${(charSpacing / 1000) * fontSize * SCALE}px`
  }
  srcCtx.font        = fontStr
  srcCtx.fillStyle   = typeof source.fill === 'string' ? source.fill : '#000000'
  srcCtx.textBaseline = 'alphabetic'
  srcCtx.fillText(source.text, PAD_X, PAD_Y + textH * 0.78)

  const W = srcEl.width
  const H = srcEl.height
  const srcPixels = srcCtx.getImageData(0, 0, W, H).data

  // ── Step 3: Create destination canvas with vertical overhead ─────────────
  // Overhead absorbs warp displacement that goes above / below the source rect.
  const OVERHEAD = Math.ceil(H * Math.max(strength, 0.1) * 1.4) + 60
  const dstW   = W
  const dstH   = H + OVERHEAD * 2
  const dstEl  = document.createElement('canvas')
  dstEl.width  = dstW
  dstEl.height = dstH
  const dstCtx    = dstEl.getContext('2d')
  const dstImgData = dstCtx.createImageData(dstW, dstH)
  const dstPixels  = dstImgData.data

  // ── Step 4: Backward-mapped pixel warp with bilinear sampling ────────────
  const inverseFn = getInverseTransformFn(warpId, W, H, strength)

  for (let dy = 0; dy < dstH; dy++) {
    for (let dx = 0; dx < dstW; dx++) {
      // oy: coordinate expressed in the original H-space (can be < 0)
      const oy = dy - OVERHEAD
      const [sx, sy] = inverseFn(dx, oy)

      if (sx < 0 || sy < 0 || sx > W - 1.001 || sy > H - 1.001) continue

      // Bilinear interpolation
      const sx0 = sx | 0,   sy0 = sy | 0
      const sx1 = Math.min(sx0 + 1, W - 1)
      const sy1 = Math.min(sy0 + 1, H - 1)
      const fx  = sx - sx0,  fy  = sy - sy0
      const w00 = (1 - fx) * (1 - fy)
      const w10 = fx        * (1 - fy)
      const w01 = (1 - fx) * fy
      const w11 = fx        * fy

      const i00 = (sy0 * W + sx0) * 4
      const i10 = (sy0 * W + sx1) * 4
      const i01 = (sy1 * W + sx0) * 4
      const i11 = (sy1 * W + sx1) * 4
      const di  = (dy  * dstW + dx) * 4

      dstPixels[di]   = w00*srcPixels[i00]   + w10*srcPixels[i10]   + w01*srcPixels[i01]   + w11*srcPixels[i11]
      dstPixels[di+1] = w00*srcPixels[i00+1] + w10*srcPixels[i10+1] + w01*srcPixels[i01+1] + w11*srcPixels[i11+1]
      dstPixels[di+2] = w00*srcPixels[i00+2] + w10*srcPixels[i10+2] + w01*srcPixels[i01+2] + w11*srcPixels[i11+2]
      dstPixels[di+3] = w00*srcPixels[i00+3] + w10*srcPixels[i10+3] + w01*srcPixels[i01+3] + w11*srcPixels[i11+3]
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0)

  // ── Step 5: Crop transparent borders ────────────────────────────────────
  const croppedCanvas = cropToContent(dstEl)

  // ── Step 6: Turn into a Fabric Image and place it on the canvas ─────────
  const dataUrl = croppedCanvas.toDataURL('image/png')

  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(dataUrl, (img) => {
      if (!img) {
        reject(new Error('Failed to create warped image.'))
        return
      }

      const imgScale = 1 / SCALE
      img.scaleX = imgScale
      img.scaleY = imgScale
      img.set({
        left:       source.left != null ? source.left : canvas.width  / 2,
        top:        source.top  != null ? source.top  : canvas.height / 2,
        originX:    'center',
        originY:    'center',
        selectable: true,
        evented:    true,
      })

      img._isWarpedText = true
      img._warpSource   = {
        text:        source.text,
        fontFamily:  source.fontFamily,
        fontSize:    source.fontSize,
        fill:        source.fill,
        fontWeight:  source.fontWeight,
        fontStyle:   source.fontStyle,
        charSpacing: source.charSpacing || 0,
        left:        source.left,
        top:         source.top,
        warpId,
        strength,
      }

      canvas.remove(fabricTextObj)
      canvas.add(img)
      canvas.setActiveObject(img)
      canvas.renderAll()
      saveState(canvas)
      resolve()
    })
  })
}
