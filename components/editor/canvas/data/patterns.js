// Upscaled glitter textures (self-hosted under public/textures).
// Each upscaled image is high-res enough to serve as BOTH the swatch preview
// and the seamless tile used for the Fabric pattern fill.
// NOTE: filenames are case-sensitive in production — keep exact casing.
const files = [
  'redred.png', 'lightRed.png', 'lightred3.png', 'darkred.png',
  'gold.png', 'darkborwn.png', 'green.png', 'ligthgreen.png',
  'blue.png', 'lightpurple.png', 'Purpule.png', 'purpulelight.png',
  'gray.png', 'balck.png',
]

export const PATTERNS = files.map((file) => ({
  id: file.replace(/\.[^.]+$/, ''),
  thumb: `/textures/${file}`,
  full: `/textures/${file}`,
}))
