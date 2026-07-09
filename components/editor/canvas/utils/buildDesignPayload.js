import { exportThumbnail, exportPrintFile, dataURLtoBlob } from './exportDesign'
import { uploadDesignFiles } from './shopifyUpload'

export function buildPayload(canvas, config, thumbnailUrl, printFileUrl) {
  const thumbnailDataUrl = thumbnailUrl || exportThumbnail(canvas)
  const printFileDataUrl = printFileUrl || exportPrintFile(canvas)

  return {
    sourceDesignId: config.sourceDesignId,
    designType: config.designType,
    variantId: config.variantId,
    productTitle: config.productTitle,
    fabricJSON: JSON.stringify(
      canvas.toJSON(['id', 'editable', 'clipPath',
        'lockMovementX', 'lockMovementY', 'lockScalingX',
        'lockScalingY', 'lockRotation', 'hoverCursor', 'label'])
    ),
    thumbnailUrl: thumbnailUrl || thumbnailDataUrl,
    printFileUrl: printFileUrl || printFileDataUrl,
    thumbnailBlob: dataURLtoBlob(thumbnailDataUrl),
    printFileBlob: dataURLtoBlob(printFileDataUrl),
    createdAt: new Date().toISOString()
  }
}

export async function buildPayloadFromExport(canvas, config, onProgress) {
  const thumbnailDataUrl = exportThumbnail(canvas)
  const printFileDataUrl = exportPrintFile(canvas)
  const thumbnailBlob = dataURLtoBlob(thumbnailDataUrl)
  const printFileBlob = dataURLtoBlob(printFileDataUrl)

  const { thumbnailUrl, printFileUrl } = await uploadDesignFiles(
    thumbnailBlob,
    printFileBlob,
    onProgress
  )

  return buildPayload(canvas, config, thumbnailUrl, printFileUrl)
}
