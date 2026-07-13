/**
 * Send the finished print file to Cloudinary DIRECTLY from the browser.
 *
 * It used to be POSTed as base64 JSON to /api/editor/export, but Vercel caps a
 * serverless request body at 4.5 MB. A print-resolution PNG (2400px, plus the
 * ~33% base64 overhead) sails past that, and the platform answers with a
 * plain-text 413 — which then blew up as a JSON parse error in the editor. Any
 * customer uploading a photo hit it.
 *
 * So: our function only signs the upload, and the bytes go straight to
 * Cloudinary. Nothing large crosses Vercel, and it is a round trip faster.
 */
export async function uploadPrintFile(pngBase64, templateId) {
  const sigRes = await fetch('/api/editor/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  })
  const sig = await sigRes.json().catch(() => null)
  if (!sigRes.ok || !sig?.signature) {
    throw new Error(sig?.error || 'Could not prepare the upload')
  }

  // data URL -> Blob, so it goes up as binary multipart rather than base64 text
  const blob = await (await fetch(pngBase64)).blob()

  const form = new FormData()
  form.append('file', blob)
  form.append('api_key', sig.apiKey)
  form.append('timestamp', String(sig.timestamp))
  form.append('signature', sig.signature)
  form.append('folder', sig.folder)
  form.append('public_id', sig.publicId)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || 'Could not upload your print file')
  }

  const printUrl = data.secure_url
  // The cart thumbnail is the same asset, transformed on Cloudinary's side — no
  // second upload, and no second render.
  const previewUrl = printUrl.replace('/upload/', '/upload/f_jpg,q_auto:good,w_800/')

  return { printUrl, previewUrl }
}
