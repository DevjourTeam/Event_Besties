import { fabric } from 'fabric'
import { loadFont } from '../utils/fontLoader'

export default function AddTextButton({ canvas, saveState }) {
  async function handleClick() {
    if (!canvas) return
    await loadFont('Montserrat')
    const text = new fabric.IText('Your Text Here', {
      left: canvas.width / 2,
      top: canvas.height / 2,
      fontFamily: 'Montserrat',
      fontSize: 36,
      fill: '#000000',
      originX: 'center',
      originY: 'center',
      editable: true
    })
    canvas.add(text)
    canvas.setActiveObject(text)
    text.enterEditing()
    text.selectAll()
    canvas.renderAll()
    saveState(canvas)
  }

  return (
    <div className="add-text-section">
      <button
        className="add-text-btn"
        onClick={handleClick}
        disabled={!canvas}
      >
        + Add Text
      </button>
    </div>
  )
}
