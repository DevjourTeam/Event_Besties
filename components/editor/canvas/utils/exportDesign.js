export function exportThumbnail(canvas) {
  return canvas.toDataURL({
    format: 'jpeg',
    quality: 0.82,
    multiplier: 0.8
  })
}

export function exportPrintFile(canvas) {
  return canvas.toDataURL({
    format: 'png',
    quality: 1.0,
    multiplier: 3
  })
}

export function dataURLtoBlob(dataURL) {
  const [header, data] = dataURL.split(',')
  const mimeType = header.match(/:(.*?);/)[1]
  const byteChars = atob(data)
  const byteArray = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i)
  }
  return new Blob([byteArray], { type: mimeType })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getPrintSizeLabel(canvas) {
  const widthCm = ((canvas.width * 3) / 96 * 2.54).toFixed(1)
  const heightCm = ((canvas.height * 3) / 96 * 2.54).toFixed(1)
  return `Approx print size: ${widthCm}cm x ${heightCm}cm at 300 DPI`
}
