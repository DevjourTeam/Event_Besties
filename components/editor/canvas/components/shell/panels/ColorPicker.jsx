import { useRef, useState } from 'react'

/* ---------- colour conversions ---------- */
export function hexToRgb(hex) {
  let h = String(hex || '').replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 0, g: 0, b: 0 }
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('')
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60; if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}
function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}
function rgbToCmyk(r, g, b) {
  const rr = r / 255, gg = g / 255, bb = b / 255
  const k = 1 - Math.max(rr, gg, bb)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: Math.round(((1 - rr - k) / (1 - k)) * 100),
    m: Math.round(((1 - gg - k) / (1 - k)) * 100),
    y: Math.round(((1 - bb - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  }
}

/**
 * The HSV square + hue bar + Hex/R/G/B and C/M/Y/K fields, matching the
 * reference designer. Shared by the object colour panel and Backgrounds.
 */
export default function ColorPicker({ value, onChange }) {
  const sqRef = useRef(null)
  const hueRef = useRef(null)
  const drag = useRef(null)
  const start = hexToRgb(value && value !== 'transparent' ? value : '#000000')
  const [hsv, setHsv] = useState(rgbToHsv(start.r, start.g, start.b))

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v)
  const rr = Math.round(rgb.r), gg = Math.round(rgb.g), bb = Math.round(rgb.b)
  const hex = rgbToHex(rgb)
  const cmyk = rgbToCmyk(rr, gg, bb)

  const emit = (next) => { setHsv(next); onChange(rgbToHex(hsvToRgb(next.h, next.s, next.v))) }
  const fromRgb = (r, g, b) => emit(rgbToHsv(clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)))

  const onSqMove = (e) => {
    const r = sqRef.current.getBoundingClientRect()
    emit({ ...hsv, s: clamp((e.clientX - r.left) / r.width, 0, 1), v: clamp(1 - (e.clientY - r.top) / r.height, 0, 1) })
  }
  const onHueMove = (e) => {
    const r = hueRef.current.getBoundingClientRect()
    emit({ ...hsv, h: clamp((e.clientX - r.left) / r.width, 0, 1) * 360 })
  }
  const startDrag = (fn) => (e) => {
    e.preventDefault()
    drag.current = fn
    fn(e)
    const move = (ev) => drag.current && drag.current(ev)
    const up = () => {
      drag.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const hueColor = rgbToHex(hsvToRgb(hsv.h, 1, 1))

  return (
    <div className="ps-picker">
      <div
        className="ps-picker__sq"
        ref={sqRef}
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
        onPointerDown={startDrag(onSqMove)}
      >
        <span className="ps-picker__dot" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
      </div>

      <div className="ps-picker__hue" ref={hueRef} onPointerDown={startDrag(onHueMove)}>
        <span className="ps-picker__huedot" style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>

      <div className="ps-picker__swatch" style={{ background: hex }} />

      <div className="ps-picker__fields">
        <Field label="Hex" value={hex.replace('#', '')} wide onChange={(v) => { const { r, g, b } = hexToRgb(v); fromRgb(r, g, b) }} />
        <Field label="R" value={rr} onChange={(v) => fromRgb(+v, gg, bb)} />
        <Field label="G" value={gg} onChange={(v) => fromRgb(rr, +v, bb)} />
        <Field label="B" value={bb} onChange={(v) => fromRgb(rr, gg, +v)} />
      </div>
      <div className="ps-picker__fields">
        <Field label="C" value={cmyk.c} readOnly />
        <Field label="M" value={cmyk.m} readOnly />
        <Field label="Y" value={cmyk.y} readOnly />
        <Field label="K" value={cmyk.k} readOnly />
      </div>
    </div>
  )
}

function Field({ label, value, onChange, readOnly, wide }) {
  return (
    <div className={`ps-field${wide ? ' ps-field--wide' : ''}`}>
      <input value={value} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} />
      <span>{label}</span>
    </div>
  )
}
