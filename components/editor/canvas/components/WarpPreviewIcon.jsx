import { WARP_PRESETS } from '../utils/textWarp'

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    const scripts = document.getElementsByTagName('script')
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src
      if (src && src.includes('editor.js')) {
        const base = src.substring(0, src.lastIndexOf('/') + 1)
        return base
      }
    }
    if (window.__EDITOR_CONFIG__ && window.__EDITOR_CONFIG__.__baseUrl) {
      return window.__EDITOR_CONFIG__.__baseUrl
    }
  }
  // Next.js host: public assets are served from the site root.
  return '/'
}

const baseUrl = getBaseUrl()

const WARP_SVG_MAP = {
  'straight': baseUrl + 'text-wrapper/text_none.51477bc3.svg',
  'wave': baseUrl + 'text-wrapper/text_wave.b3afb8bb.svg',
  'squeeze': baseUrl + 'text-wrapper/text_bridge.15794d61.svg',
  'bridge-down': baseUrl + 'text-wrapper/text_bridgedown.708d351c.svg',
  'pinch': baseUrl + 'text-wrapper/text_pinch.84790266.svg',
  'bulge': baseUrl + 'text-wrapper/text_bulge.0db8f144.svg',
  'arch-up-small': baseUrl + 'text-wrapper/text_arch.22ee4c54.svg',
  'bridge-up': baseUrl + 'text-wrapper/text_roof.6afee986.svg',
  'arch-down': baseUrl + 'text-wrapper/text_archdown.64e2561f.svg',
  'arc-up-large': baseUrl + 'text-wrapper/text_arcdown.e3908c6b.svg',
  'flag': baseUrl + 'text-wrapper/text_sloperight.8bd3cf11.svg',
  'perspective-left': baseUrl + 'text-wrapper/text_slopeleft.b0815dd4.svg',
  'arch-steep': baseUrl + 'text-wrapper/text_rooft.5a2fe42c.svg',
  'diamond': baseUrl + 'text-wrapper/text_wedgebl.aae2c7e3.svg',
  'pinch-top': baseUrl + 'text-wrapper/text_wedgebr.757a9124.svg',
  'pinch-bottom': baseUrl + 'text-wrapper/text_wedgebr.757a9124.svg',
  'bulge-horizontal': baseUrl + 'text-wrapper/text_bulge.0db8f144.svg',
  'lens': baseUrl + 'text-wrapper/text_uppercircle.58ea09c8.svg',
  'circle': baseUrl + 'text-wrapper/text_circle.5dda2a2a.svg',
}

export default function WarpPreviewIcon({ warpId, label, isActive, onClick }) {
  const svgSrc = WARP_SVG_MAP[warpId] || WARP_SVG_MAP['straight']

  return (
    <div
      className={'warp-card' + (isActive ? ' active' : '')}
      onClick={onClick}
      title={label}
    >
      <img 
        src={svgSrc} 
        alt={label}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          padding: '4px'
        }}
      />
    </div>
  )
}