import { fabric } from 'fabric'

export function applyClipPath(canvas, svgPathString) {
  const clipPath = new fabric.Path(svgPathString, {
    absolutePositioned: true,
    selectable: false,
    evented: false
  })
  canvas.clipPath = clipPath
  canvas.renderAll()
}

export function removeClipPath(canvas) {
  canvas.clipPath = null
  canvas.renderAll()
}
