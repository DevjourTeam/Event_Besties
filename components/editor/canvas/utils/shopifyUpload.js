import { callShopifyProxy } from './apiClient'

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function uploadFileToShopify(blob, filename, onProgress) {
  onProgress(1, 3, 'Preparing upload...')
  
  const staged = await callShopifyProxy('stagedUpload', {
    filename,
    mimeType: blob.type,
    fileSize: blob.size
  })

  onProgress(2, 3, 'Uploading file...')
  
  const formData = new FormData()
  staged.parameters.forEach(({ name, value }) => formData.append(name, value))
  formData.append('file', blob, filename)
  
  const uploadRes = await fetch(staged.url, { method: 'POST', body: formData })
  if (!uploadRes.ok) {
    throw new Error('S3 upload failed: ' + uploadRes.status)
  }

  onProgress(3, 3, 'Finalizing...')
  
  let fileRecord = await callShopifyProxy('createFile', {
    originalSource: staged.resourceUrl,
    contentType: 'IMAGE'
  })

  let retries = 0
  while (fileRecord.status !== 'READY' && retries < 8) {
    await sleep(1500)
    retries++
  }

  const cdnUrl = fileRecord.image?.url || fileRecord.url
  if (!cdnUrl) {
    throw new Error('No CDN URL returned from Shopify Files')
  }
  
  return cdnUrl
}

export async function uploadDesignFiles(thumbnailBlob, printFileBlob, onProgress) {
  onProgress(0, 'Uploading thumbnail...')
  
  const thumbnailUrl = await uploadFileToShopify(
    thumbnailBlob,
    'design-thumbnail-' + Date.now() + '.jpg',
    (step, total, label) => onProgress(step, label)
  )
  
  onProgress(0, 'Uploading print file...')
  
  const printFileUrl = await uploadFileToShopify(
    printFileBlob,
    'design-print-' + Date.now() + '.png',
    (step, total, label) => onProgress(step, label)
  )
  
  return { thumbnailUrl, printFileUrl }
}