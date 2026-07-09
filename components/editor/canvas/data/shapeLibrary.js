// Preset "Solid objects" shapes for the Shapes library, each as an SVG path in a
// 0 0 100 100 viewBox. Used both for the picker preview and the Fabric Path on canvas.

const f = (n) => Number(n).toFixed(2)
const pt = (cx, cy, r, a) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`

function polygon(n, r = 46, rot = -Math.PI / 2) {
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n
    d += (i === 0 ? 'M' : 'L') + pt(50, 50, r, a) + ' '
  }
  return d + 'Z'
}

function star(points, ro = 48, ri = 20, rot = -Math.PI / 2) {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points
    const r = i % 2 === 0 ? ro : ri
    d += (i === 0 ? 'M' : 'L') + pt(50, 50, r, a) + ' '
  }
  return d + 'Z'
}

function roundedRect(w, h, r) {
  const x = (100 - w) / 2
  const y = (100 - h) / 2
  return `M${f(x + r)} ${f(y)} h${f(w - 2 * r)} a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)} ` +
    `v${f(h - 2 * r)} a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)} h${f(-(w - 2 * r))} ` +
    `a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)} v${f(-(h - 2 * r))} a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)} Z`
}

const CIRCLE = 'M50 4 A46 46 0 1 1 49.99 4 Z'

export const SHAPES = [
  { id: 'line', path: 'M4 45 H96 V55 H4 Z' },
  { id: 'circle', path: CIRCLE },
  { id: 'half-circle', path: 'M30 6 A44 44 0 0 1 30 94 Z' },
  { id: 'rect', path: 'M6 28 H94 V72 H6 Z' },
  { id: 'square', path: 'M14 14 H86 V86 H14 Z' },
  { id: 'v-bar', path: 'M38 6 H62 V94 H38 Z' },
  { id: 'arch', path: 'M18 96 V44 A32 32 0 0 1 82 44 V96 Z' },
  { id: 'seal-8', path: star(8, 48, 34) },
  { id: 'pentagon', path: polygon(5) },
  { id: 'star-5', path: star(5, 48, 20) },
  { id: 'circle-sm', path: 'M50 14 A36 36 0 1 1 49.99 14 Z' },
  { id: 'rounded-square', path: roundedRect(72, 72, 16) },
  { id: 'triangle', path: polygon(3, 50) },
  { id: 'hexagon', path: polygon(6) },
  { id: 'star-4', path: star(4, 50, 18) },
  { id: 'heptagon', path: polygon(7) },
  { id: 'octagon', path: polygon(8) },
  { id: 'triangle-r', path: 'M50 8 L92 86 Q50 78 8 86 Z' },
  { id: 'star-6', path: star(6, 48, 24) },
  { id: 'rounded-rect', path: roundedRect(90, 56, 14) },
  { id: 'starburst', path: star(12, 48, 36) },
  { id: 'diamond', path: 'M50 6 L94 50 L50 94 L6 50 Z' },
]
