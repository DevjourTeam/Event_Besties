import { fabric } from 'fabric'

export function applyFilter(canvas, fabricImage, filterName) {
  fabricImage.filters = []
  switch (filterName) {
    case 'grayscale':
      fabricImage.filters.push(new fabric.Image.filters.Grayscale())
      break
    case 'sepia':
      fabricImage.filters.push(new fabric.Image.filters.Sepia())
      break
    case 'invert':
      fabricImage.filters.push(new fabric.Image.filters.Invert())
      break
    case 'brightness':
      fabricImage.filters.push(new fabric.Image.filters.Brightness({ brightness: 0.15 }))
      break
    case 'contrast':
      fabricImage.filters.push(new fabric.Image.filters.Contrast({ contrast: 0.15 }))
      break
    case 'none':
    default:
      break
  }
  fabricImage.applyFilters()
  canvas.renderAll()
}

export async function removeBackground(canvas, fabricImage, onStart, onDone, onError) {
  try {
    onStart()
    const src = fabricImage.getSrc()
    
    let blob
    if (src.startsWith('data:')) {
      const base64Response = await fetch(src)
      blob = await base64Response.blob()
    } else if (src.startsWith('blob:')) {
      const response = await fetch(src)
      blob = await response.blob()
    } else {
      const response = await fetch(src)
      blob = await response.blob()
    }

    const formData = new FormData()
    formData.append('file', blob, 'image.png')
    
    const apiResponse = await fetch('http://127.0.0.1:8080/remove-bg', {
      method: 'POST',
      body: formData
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      throw new Error(`API error ${apiResponse.status}: ${errorText}`)
    }

    const resultBlob = await apiResponse.blob()
    const newUrl = URL.createObjectURL(resultBlob)
    
    fabricImage.setSrc(newUrl, () => {
      canvas.renderAll()
      onDone()
    }, { crossOrigin: 'anonymous' })
  } catch (err) {
    console.error('Background removal error:', err)
    onError(err.message || 'Failed to remove background')
  }
}

export function setOpacity(canvas, fabricImage, value) {
  fabricImage.set('opacity', value / 100)
  canvas.renderAll()
}

export function isLowResolution(fabricImage) {
  const el = fabricImage.getElement()
  return el.naturalWidth < 800 || el.naturalHeight < 800
}
