import { Control, controlsUtils } from 'fabric'

/**
 * Custom on-canvas element controls matching the reference:
 *   TL = move · TR = rotate · BL = delete (red) · BR = resize
 * Icons are tiny SVGs drawn into each control's render().
 */

const svg = (inner, bg) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">` +
      `<rect width="28" height="28" rx="6" fill="${bg}"/>` +
      `<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</g>` +
      `</svg>`
  )

const BLUE = '#3b6fe0'
const RED = '#e0563b'

const ICONS = {
  move: svg(
    `<path d="M14 6v16M6 14h16"/><path d="M11.5 8.5 14 6l2.5 2.5"/><path d="M11.5 19.5 14 22l2.5-2.5"/><path d="M8.5 11.5 6 14l2.5 2.5"/><path d="M19.5 11.5 22 14l-2.5 2.5"/>`,
    BLUE
  ),
  rotate: svg(
    `<path d="M20 14a6 6 0 1 1-1.8-4.3"/><path d="M20 7v4h-4"/>`,
    BLUE
  ),
  del: svg(
    `<path d="M8 10h12"/><path d="M11 10V8h6v2"/><path d="M9.5 10l1 11h7l1-11"/><path d="M13 13.5v4M16 13.5v4"/>`,
    RED
  ),
  resize: svg(`<path d="M9 9l10 10"/><path d="M9 13V9h4"/><path d="M19 15v4h-4"/>`, BLUE),
}

function loadImg(src) {
  if (typeof Image === 'undefined') return null
  const i = new Image()
  i.src = src
  return i
}
const IMG = {
  move: loadImg(ICONS.move),
  rotate: loadImg(ICONS.rotate),
  del: loadImg(ICONS.del),
  resize: loadImg(ICONS.resize),
}

const SIZE = 26
function renderIcon(img) {
  return function (ctx, left, top) {
    if (!img) return
    ctx.save()
    ctx.translate(left, top)
    ctx.shadowColor = 'rgba(20,25,40,0.25)'
    ctx.shadowBlur = 3
    ctx.shadowOffsetY = 1
    ctx.drawImage(img, -SIZE / 2, -SIZE / 2, SIZE, SIZE)
    ctx.restore()
  }
}

// TL move: drag the object from the handle, keeping the grab offset.
function dragHandler(eventData, transform, x, y) {
  const target = transform.target
  const ex = Number.isFinite(transform.ex) ? transform.ex : x
  const ey = Number.isFinite(transform.ey) ? transform.ey : y
  const ox = transform.original?.left ?? target.left
  const oy = transform.original?.top ?? target.top
  target.set({ left: ox + (x - ex), top: oy + (y - ey) })
  target.setCoords()
  return true
}

// BL delete: remove the object on click-release.
function deleteHandler(eventData, transform) {
  const target = transform.target
  const canvas = target.canvas
  if (!canvas) return false
  canvas.remove(target)
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return true
}

function makeControls() {
  return {
    tl: new Control({
      x: -0.5, y: -0.5,
      cursorStyle: 'move',
      actionName: 'drag',
      actionHandler: dragHandler,
      render: renderIcon(IMG.move),
    }),
    tr: new Control({
      x: 0.5, y: -0.5,
      actionName: 'rotate',
      cursorStyleHandler: controlsUtils.rotationStyleHandler,
      actionHandler: controlsUtils.rotationWithSnapping,
      render: renderIcon(IMG.rotate),
    }),
    bl: new Control({
      x: -0.5, y: 0.5,
      cursorStyle: 'pointer',
      mouseUpHandler: deleteHandler,
      render: renderIcon(IMG.del),
    }),
    br: new Control({
      x: 0.5, y: 0.5,
      actionName: 'scale',
      cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
      actionHandler: controlsUtils.scalingEqually,
      render: renderIcon(IMG.resize),
    }),
  }
}

const STYLE = {
  transparentCorners: false,
  cornerSize: SIZE,
  borderColor: '#3b6fe0',
  borderScaleFactor: 1.5,
  padding: 4,
}

/** Assign our custom controls + selection styling to a single object. */
export function applyObjectControls(obj) {
  if (!obj || obj.__chrome) return
  obj.controls = makeControls()
  obj.set(STYLE)
}

/** Re-apply to every (non-chrome) object — e.g. after loadFromJSON (undo/redo). */
export function applyControlsToAll(fc) {
  fc.getObjects().forEach(applyObjectControls)
}
