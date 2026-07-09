export function constrainToBounds(canvas) {
  canvas.on('object:modified', (e) => {
    const obj = e.target
    
    obj._lastGoodLeft = obj.left
    obj._lastGoodTop = obj.top
    obj._lastGoodScaleX = obj.scaleX
    obj._lastGoodScaleY = obj.scaleY
    obj.setCoords()
    canvas.renderAll()
  })
}
