import { exportThumbnail, exportPrintFile, dataURLtoBlob } from './exportDesign'
import { uploadDesignFiles } from './shopifyUpload'
import { callShopifyProxy } from './apiClient'

export const SAVE_STEPS_CONFIG = [
  { id: 'export',  label: 'Preparing your design...' },
  { id: 'upload',  label: 'Uploading files to Shopify...' },
  { id: 'save',    label: 'Saving design data...' },
  { id: 'done',    label: 'Done!' }
]

export async function saveDesign(canvas, config, onStepUpdate) {
  const isDev = window.location.hostname === 'localhost'

  if (isDev) {
    console.log('Dev mode: skipping real Shopify save')
    await new Promise(r => setTimeout(r, 1500))
    return { designId: 'dev-design-' + Date.now(), thumbnailUrl: '', printFileUrl: '' }
  }

  onStepUpdate('export', 'active')

  const thumbnailDataUrl = exportThumbnail(canvas)
  const printFileDataUrl = exportPrintFile(canvas)
  const thumbnailBlob = dataURLtoBlob(thumbnailDataUrl)
  const printFileBlob = dataURLtoBlob(printFileDataUrl)
  onStepUpdate('export', 'done')

  onStepUpdate('upload', 'active')
  const { thumbnailUrl, printFileUrl } = await uploadDesignFiles(
    thumbnailBlob,
    printFileBlob,
    () => {}
  )
  onStepUpdate('upload', 'done')

  onStepUpdate('save', 'active')
  const fabricJSON = JSON.stringify(
    canvas.toJSON(['id','editable','clipPath','lockMovementX','lockMovementY',
      'lockScalingX','lockScalingY','lockRotation','hoverCursor','label'])
  )

  if (fabricJSON.length > 120000) {
    throw new Error('Design is too complex. Please reduce the number of elements and try again.')
  }

  const metaobject = await callShopifyProxy('saveMetaobject', {
    type: 'design_submission',
    fields: {
      source_design_id: config.sourceDesignId,
      design_type: config.designType,
      variant_id: String(config.variantId || ''),
      product_title: config.productTitle,
      fabric_json: fabricJSON,
      thumbnail_url: thumbnailUrl,
      print_file_url: printFileUrl,
      created_at: new Date().toISOString()
    }
  })
  onStepUpdate('save', 'done')
  onStepUpdate('done', 'done')

  return { designId: metaobject.id, thumbnailUrl, printFileUrl }
}

export async function loadDesign(designId) {
  const metaobject = await callShopifyProxy('getMetaobject', { id: designId })
  const fields = {}
  metaobject.fields.forEach(f => { fields[f.key] = f.value })

  return {
    fabricJSON: fields.fabric_json,
    thumbnailUrl: fields.thumbnail_url,
    printFileUrl: fields.print_file_url,
    designType: fields.design_type,
    sourceDesignId: fields.source_design_id,
    productTitle: fields.product_title,
    createdAt: fields.created_at
  }
}