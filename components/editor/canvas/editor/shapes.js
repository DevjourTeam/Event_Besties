/**
 * Shape geometry — product-agnostic.
 * Given a shape type (or a custom svgPath) and a target box (w×h in px),
 * return an SVG path string in canvas coordinates (0,0)→(w,h).
 *
 * This is what makes the engine load "any product": a sailboard is just
 * type 'arch', a circle sign is 'circle', a bear is a custom svgPath, etc.
 */

export function buildShapePath(shape, w, h) {
  const type = shape?.type || 'rect'

  // A custom uploaded/admin SVG path takes precedence — scale it to the box.
  if (shape?.svgPath) {
    return scalePathToBox(shape.svgPath, w, h)
  }

  switch (type) {
    case 'arch': {
      // semicircular top, straight sides — the "sailboard" shape
      const r = w / 2
      return `M 0 ${h} L 0 ${r} A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h} Z`
    }
    case 'circle': {
      const r = Math.min(w, h) / 2
      const cx = w / 2
      const cy = h / 2
      return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`
    }
    case 'ellipse': {
      const rx = w / 2
      const ry = h / 2
      return `M 0 ${ry} a ${rx} ${ry} 0 1 0 ${w} 0 a ${rx} ${ry} 0 1 0 ${-w} 0 Z`
    }
    case 'rounded': {
      const rad = Math.min(w, h) * 0.06
      return roundedRectPath(0, 0, w, h, rad)
    }
    case 'rect':
    default:
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
  }
}

function roundedRectPath(x, y, w, h, r) {
  return [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ')
}

/**
 * Scale an arbitrary SVG path string to fit (0,0)→(w,h) using its bounding box.
 * Uses a detached SVG in the DOM to measure — same technique as the admin dashboard.
 */
export function scalePathToBox(pathString, w, h, pad = 0) {
  const bbox = getPathBBox(pathString)
  if (!bbox || bbox.width === 0 || bbox.height === 0) {
    return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`
  }
  const availW = w - pad * 2
  const availH = h - pad * 2
  const scale = Math.min(availW / bbox.width, availH / bbox.height)
  const offsetX = pad + (availW - bbox.width * scale) / 2 - bbox.x * scale
  const offsetY = pad + (availH - bbox.height * scale) / 2 - bbox.y * scale
  return transformPath(pathString, scale, offsetX, offsetY)
}

function getPathBBox(pathString) {
  if (typeof document === 'undefined') return null
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathString)
  svg.appendChild(path)
  document.body.appendChild(svg)
  let bbox
  try {
    const b = path.getBBox()
    bbox = { x: b.x, y: b.y, width: b.width, height: b.height }
  } catch {
    bbox = null
  }
  document.body.removeChild(svg)
  return bbox
}

/** Apply uniform scale + translate to every coordinate pair in a path string. */
function transformPath(pathString, scale, offsetX, offsetY) {
  // tokenise into commands + numbers; transform absolute coords only.
  const tokens = pathString.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || []
  let out = ''
  let cmd = ''
  let coordIndex = 0
  for (const t of tokens) {
    if (/[a-zA-Z]/.test(t)) {
      cmd = t
      coordIndex = 0
      out += t + ' '
      continue
    }
    const n = parseFloat(t)
    const isAbsolute = cmd === cmd.toUpperCase()
    // For arc commands the rx,ry,rotation,flags must not be offset.
    if (cmd === 'A' || cmd === 'a') {
      const pos = coordIndex % 7
      if (pos === 0 || pos === 1) out += n * scale + ' '       // rx, ry
      else if (pos === 2 || pos === 3 || pos === 4) out += n + ' ' // rot, large, sweep
      else if (pos === 5) out += (isAbsolute ? n * scale + offsetX : n * scale) + ' '
      else out += (isAbsolute ? n * scale + offsetY : n * scale) + ' '
    } else {
      const even = coordIndex % 2 === 0
      if (isAbsolute) out += (even ? n * scale + offsetX : n * scale + offsetY) + ' '
      else out += n * scale + ' '
    }
    coordIndex++
  }
  return out.trim()
}
