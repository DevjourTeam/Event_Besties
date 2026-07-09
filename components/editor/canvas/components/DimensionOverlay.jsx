export default function DimensionOverlay({ canvasWidth = 500, canvasHeight = 600 }) {
  const widthCm = ((canvasWidth * 2.54) / 96).toFixed(1)
  const heightCm = ((canvasHeight * 2.54) / 96).toFixed(1)

  return (
    <div className="dimension-overlay">
      {/* Top dimension line */}
      <div className="dimension-top">
        <span className="dimension-tick" />
        <span className="dimension-line" />
        <span className="dimension-tick" />
        <span className="dimension-label">{widthCm} cm</span>
      </div>

      {/* Right dimension line */}
      <div className="dimension-right">
        <span className="dimension-tick-h" />
        <span className="dimension-line-v" />
        <span className="dimension-tick-h" />
        <span className="dimension-label-v">{heightCm} cm</span>
      </div>

      {/* Canvas border guides */}
      <div className="canvas-guides">
        <div className="guide-outer" />
        <div className="guide-inner" />
      </div>
    </div>
  )
}