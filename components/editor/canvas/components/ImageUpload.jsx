import { useRef, useState } from 'react'
import { fabric } from 'fabric'
import { uploadFileToShopify } from '../utils/shopifyUpload'
import UploadProgress from './UploadProgress'

const ACCEPTED = 'image/png,image/jpeg,image/webp'

export default function ImageUpload({ canvas, saveState }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStep, setUploadStep] = useState(0)
  const [uploadLabel, setUploadLabel] = useState('')

  function handleFile(file) {
    if (!canvas || !file) return
    if (!file.type.startsWith('image/')) return

    setLoading(true)
    const url = URL.createObjectURL(file)

    fabric.Image.fromURL(
      url,
      (img) => {
        const scale = Math.min(
          (canvas.width - 40) / img.width,
          (canvas.height - 40) / img.height
        )
        img.set({ scaleX: scale, scaleY: scale, left: 20, top: 20 })
        canvas.add(img)
        canvas.setActiveObject(img)
        canvas.renderAll()
        saveState(canvas)
        setLoading(false)

        const isDev = window.location.hostname === 'localhost'
        if (!isDev) {
          setUploading(true)
          setUploadStep(0)
          setUploadLabel('Preparing upload...')
          
          uploadFileToShopify(file, file.name,
            (step, total, label) => {
              setUploadStep(step)
              setUploadLabel(label)
            }
          )
            .then((cdnUrl) => {
              const fabricImg = canvas.getActiveObject()
              if (fabricImg && fabricImg.type === 'image') {
                fabricImg.setSrc(cdnUrl, () => {
                  canvas.renderAll()
                  saveState(canvas)
                }, { crossOrigin: 'anonymous' })
              }
            })
            .catch((err) => {
              console.warn('Shopify upload failed, using local blob URL:', err)
            })
            .finally(() => {
              setUploading(false)
            })
        } else {
          console.log('Dev mode: skipping Shopify Files upload, using blob URL')
        }
      },
      { crossOrigin: 'anonymous' }
    )
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  function onDragOver(e) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onChange(e) {
    handleFile(e.target.files[0])
    e.target.value = ''
  }

  return (
    <div className="upload-section">
      <span className="panel-label">Image</span>
      <div
        className={`upload-zone${dragging ? ' upload-zone--active' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        {loading ? (
          <div className="upload-spinner" aria-label="Loading image" />
        ) : (
          <>
            <div className="upload-icon">↑</div>
            <div className="upload-label">Drag & drop or click to upload</div>
            <div className="upload-hint">PNG · JPG · WEBP</div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={onChange}
      />
      <UploadProgress
        visible={uploading}
        step={uploadStep}
        totalSteps={3}
        label={uploadLabel}
      />
    </div>
  )
}
