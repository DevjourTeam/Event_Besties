export const TEXT_EFFECT_PRESETS = [
  {
    id: 'none',
    label: 'None',
    previewText: 'Aa',
    styles: {
      fill: '#000000',
      stroke: null,
      strokeWidth: 0,
      paintFirst: 'fill',
      shadow: null
    }
  },
  {
    id: 'outline-only',
    label: 'Outline',
    previewText: 'Aa',
    styles: {
      fill: 'transparent',
      stroke: '#222222',
      strokeWidth: 2,
      paintFirst: 'stroke',
      shadow: null
    }
  },
  {
    id: 'gold-script',
    label: 'Gold',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#FFD700' },
          { offset: 0.5, color: '#FFA500' },
          { offset: 1, color: '#FFD700' }
        ]
      },
      stroke: '#4a2800',
      strokeWidth: 6,
      paintFirst: 'stroke',
      shadow: '2px 2px 3px rgba(0,0,0,0.4)'
    }
  },
  {
    id: 'yellow-black',
    label: 'Bold Gold',
    previewText: 'Aa',
    styles: {
      fill: '#FFD700',
      stroke: '#000000',
      strokeWidth: 12,
      paintFirst: 'stroke',
      shadow: null
    }
  },
  {
    id: 'blue-flat',
    label: 'Blue Flat',
    previewText: 'Aa',
    styles: {
      fill: '#5BB8F5',
      stroke: null,
      strokeWidth: 0,
      shadow: null
    }
  },
  {
    id: 'yellow-3d',
    label: '3D Gold',
    previewText: 'Aa',
    styles: {
      fill: '#FFD700',
      stroke: '#1565C0',
      strokeWidth: 10,
      paintFirst: 'stroke',
      shadow: {
        color: '#0D3B7A',
        blur: 0,
        offsetX: 6,
        offsetY: 6
      }
    }
  },
  {
    id: 'pink-outline',
    label: 'Pink Outline',
    previewText: 'Aa',
    styles: {
      fill: 'transparent',
      stroke: '#E91E8C',
      strokeWidth: 1.5,
      paintFirst: 'stroke',
      shadow: null
    }
  },
  {
    id: 'green-bubble',
    label: 'Green Bubble',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#8BC34A' },
          { offset: 0.5, color: '#4CAF50' },
          { offset: 1, color: '#2E7D32' }
        ]
      },
      stroke: '#1B5E20',
      strokeWidth: 8,
      paintFirst: 'stroke',
      shadow: {
        color: '#1B5E20',
        blur: 0,
        offsetX: 5,
        offsetY: 5
      }
    }
  },
  {
    id: 'red-glossy',
    label: 'Red Glossy',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#FF6B6B' },
          { offset: 0.5, color: '#EE2A2A' },
          { offset: 1, color: '#B71C1C' }
        ]
      },
      stroke: '#8B0000',
      strokeWidth: 4,
      paintFirst: 'stroke',
      shadow: '3px 3px 5px rgba(0,0,0,0.4)'
    }
  },
  {
    id: 'purple-neon',
    label: 'Purple Neon',
    previewText: 'Aa',
    styles: {
      fill: '#E040FB',
      stroke: '#9C27B0',
      strokeWidth: 3,
      paintFirst: 'fill',
      shadow: {
        color: '#E040FB',
        blur: 15,
        offsetX: 0,
        offsetY: 0
      }
    }
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 100, y2: 0 },
        colorStops: [
          { offset: 0, color: '#FF0000' },
          { offset: 0.17, color: '#FF7F00' },
          { offset: 0.33, color: '#FFFF00' },
          { offset: 0.5, color: '#00FF00' },
          { offset: 0.67, color: '#0000FF' },
          { offset: 0.83, color: '#4B0082' },
          { offset: 1, color: '#9400D3' }
        ]
      },
      stroke: '#333',
      strokeWidth: 1,
      paintFirst: 'fill',
      shadow: '2px 2px 4px rgba(0,0,0,0.3)'
    }
  },
  {
    id: 'silver-metallic',
    label: 'Silver',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#F5F5F5' },
          { offset: 0.5, color: '#BDBDBD' },
          { offset: 1, color: '#757575' }
        ]
      },
      stroke: '#424242',
      strokeWidth: 5,
      paintFirst: 'stroke',
      shadow: '2px 2px 4px rgba(0,0,0,0.4)'
    }
  },
  {
    id: 'orange-fire',
    label: 'Fire Orange',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#FFEB3B' },
          { offset: 0.3, color: '#FF9800' },
          { offset: 0.6, color: '#F44336' },
          { offset: 1, color: '#B71C1C' }
        ]
      },
      stroke: '#BF360C',
      strokeWidth: 6,
      paintFirst: 'stroke',
      shadow: '3px 3px 6px rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'teal-ocean',
    label: 'Ocean Teal',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#80DEEA' },
          { offset: 0.5, color: '#00ACC1' },
          { offset: 1, color: '#006064' }
        ]
      },
      stroke: '#004D40',
      strokeWidth: 5,
      paintFirst: 'stroke',
      shadow: {
        color: '#004D40',
        blur: 0,
        offsetX: 4,
        offsetY: 4
      }
    }
  },
  {
    id: 'white-black',
    label: 'White on Black',
    previewText: 'Aa',
    styles: {
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 8,
      paintFirst: 'stroke',
      shadow: '2px 2px 4px rgba(0,0,0,0.5)'
    }
  },
  {
    id: 'black-white',
    label: 'Black on White',
    previewText: 'Aa',
    styles: {
      fill: '#000000',
      stroke: '#FFFFFF',
      strokeWidth: 6,
      paintFirst: 'stroke',
      shadow: '2px 2px 4px rgba(0,0,0,0.2)'
    }
  },
  {
    id: 'royal-blue',
    label: 'Royal Blue',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#42A5F5' },
          { offset: 0.5, color: '#1E88E5' },
          { offset: 1, color: '#0D47A1' }
        ]
      },
      stroke: '#0D47A1',
      strokeWidth: 6,
      paintFirst: 'stroke',
      shadow: {
        color: '#0D47A1',
        blur: 0,
        offsetX: 5,
        offsetY: 5
      }
    }
  },
  {
    id: 'rose-gold',
    label: 'Rose Gold',
    previewText: 'Aa',
    styles: {
      fill: {
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 0, y2: 80 },
        colorStops: [
          { offset: 0, color: '#F8BBD9' },
          { offset: 0.5, color: '#EC407A' },
          { offset: 1, color: '#880E4F' }
        ]
      },
      stroke: '#880E4F',
      strokeWidth: 5,
      paintFirst: 'stroke',
      shadow: '2px 2px 4px rgba(0,0,0,0.3)'
    }
  }
]

export function applyTextEffect(fabricTextObject, preset, canvas) {
  if (!fabricTextObject || !preset) return

  const { styles } = preset

  if (styles.fill && typeof styles.fill === 'object') {
    const gradient = new fabric.Gradient({
      type: styles.fill.type,
      gradientUnits: 'pixels',
      coords: styles.fill.coords,
      colorStops: styles.fill.colorStops
    })
    fabricTextObject.set('fill', gradient)
  } else {
    fabricTextObject.set('fill', styles.fill)
  }

  fabricTextObject.set({
    stroke: styles.stroke || null,
    strokeWidth: styles.strokeWidth || 0,
    paintFirst: styles.paintFirst || 'fill'
  })

  if (styles.shadow) {
    fabricTextObject.set('shadow', new fabric.Shadow(styles.shadow))
  } else {
    fabricTextObject.set('shadow', null)
  }

  if (canvas) {
    canvas.renderAll()
  }
}

export function getPreviewStyles(preset) {
  if (!preset || !preset.styles) return {}
  
  const { fill, stroke, strokeWidth, shadow } = preset.styles
  const previewStyle = {}
  
  if (fill && typeof fill === 'object') {
    const stops = fill.colorStops.map(s => `${s.color} ${s.offset * 100}%`).join(', ')
    previewStyle.background = `linear-gradient(180deg, ${stops})`
    previewStyle.webkitBackgroundClip = 'text'
    previewStyle.webkitTextFillColor = 'transparent'
  } else if (fill && fill !== 'transparent') {
    previewStyle.color = fill
  } else {
    previewStyle.color = 'transparent'
    previewStyle.webkitTextFillColor = 'transparent'
  }
  
  if (stroke && strokeWidth > 0) {
    previewStyle.textShadow = `0 0 0 ${stroke}`
  }
  
  return previewStyle
}