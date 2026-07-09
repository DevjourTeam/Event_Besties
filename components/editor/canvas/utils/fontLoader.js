export const FONT_LIST = [
  'Fredoka One', 'Pacifico', 'Boogaloo', 'Titan One', 'Lilita One', 'Righteous',
  'Baloo 2', 'Permanent Marker', 'Comic Neue', 'Chewy', 'Luckiest Guy', 'Bangers',
  'Kaushan Script', 'Lobster', 'Sacramento', 'Pinyon Script', 'Dancing Script',
  'Great Vibes', 'Alfa Slab One', 'Bebas Neue', 'Big Shoulders Display', 'Bungee',
  'Cabin Sketch', 'Chunky', 'Comfortaa', 'Courgette', 'Creepster', 'Devonshire',
  'Eater', 'Frijole', 'Fugaz One', 'Gloria Hallelujah', 'Gochi Hand', 'Gravitas One',
  'Homemade Apple', 'Inspiration', 'Jolly Lodger', 'Kelly Slab', 'Lemon Tuesday',
  'Lobster Two', 'Love Ya Like A Sister', 'Metamorphous', 'Monoton', 'Moulp',
  'Neucha', 'Niconne', 'Nosifer', 'Passion One', 'Play', 'Pompiere', 'Ranchers',
  'Raving Rebel', 'Redressed', 'Renner', 'Risque', 'Road Rage', 'Roboto Slab',
  'Rock Salt', 'Russo One', 'Shadows Into Light', 'Shrikhand', 'Staatliches',
  'Stint Ultra Expanded', 'Stretch Pro', 'Sunshiney', 'The Girl Next Door', 'Ultra',
  'UnifrakturMaguntia', 'Vibur', 'Waiting for the Horizon', 'Wallpoet', 'Warnes',
  'Wellfleet', 'Xarrov', 'Yeseva One', 'Zcool KuaiLe', 'Zilla Slab'
]

const loadedFonts = new Set()

export function loadFont(fontName) {
  if (loadedFonts.has(fontName)) return Promise.resolve()

  return new Promise((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`
    link.onload = () => {
      loadedFonts.add(fontName)
      resolve()
    }
    link.onerror = () => {
      loadedFonts.add(fontName)
      resolve()
    }
    document.head.appendChild(link)
  })
}

export function preloadAllFonts() {
  FONT_LIST.forEach((font) => loadFont(font))
}