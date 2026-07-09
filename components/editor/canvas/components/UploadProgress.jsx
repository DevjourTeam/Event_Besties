export default function UploadProgress({ visible, step, totalSteps, label }) {
  if (!visible) return null

  const progress = (step / totalSteps) * 100

  return (
    <div className="upload-progress-overlay">
      <div className="upload-progress-container">
        <div className="upload-progress-bar">
          <div 
            className="upload-progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="upload-progress-label">{label}</div>
      </div>
    </div>
  )
}