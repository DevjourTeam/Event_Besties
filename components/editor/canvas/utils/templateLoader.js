export function loadTemplate(canvas, templateJSON) {
  return new Promise((resolve) => {
    canvas.loadFromJSON(templateJSON, () => {
      canvas.forEachObject((obj) => {
        if (obj.editable === false) {
          obj.selectable = false
          obj.evented = false
          obj.lockMovementX = true
          obj.lockMovementY = true
          obj.lockScalingX = true
          obj.lockScalingY = true
          obj.lockRotation = true
          obj.hoverCursor = 'default'
        }
        if (obj.editable === true) {
          obj.set({
            borderColor: '#2196F3',
            cornerColor: '#2196F3',
            borderDashArray: [6, 4],
            cornerStyle: 'circle'
          })
          obj.selectable = false
          obj.evented = false
        }
      })
      canvas.renderAll()
      resolve()
    })
  })
}

export function getEditableObjects(canvas) {
  return canvas.getObjects().filter(obj => obj.editable === true)
}

export function getObjectById(canvas, id) {
  return canvas.getObjects().find(obj => obj.id === id) || null
}
