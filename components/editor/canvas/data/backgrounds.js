/**
 * Background patterns, hotlinked from the reference library.
 *
 * Each entry has a `thumb` (the small swatch shown in the panel) and a `full`
 * (the high-resolution image actually used to fill the print surface). The full
 * image is the same path with the `thumb_` prefix dropped — verified to exist
 * (e.g. the S3 one is 4.2MB full vs 2.4KB thumb).
 */
const THUMBS = [
  'https://imprintawsbucket.s3.eu-north-1.amazonaws.com/assets/backgrounds/thumb_202604150801394240.jpg',
  'https://imprintawsbucket.s3.eu-north-1.amazonaws.com/assets/backgrounds/thumb_202604150801137130.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202307180516115090.png',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202307180236443714.png',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_4.png',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_3.png',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_12.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_11.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_10.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_2.png',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_9.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_8.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_7.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_6.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_5.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_4.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_1.png',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_2.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579_1.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579.jpg',
  'https://partiesandsigns.com/designer/assets/backgrounds/thumb_202003300117121579.png',
]

export const BACKGROUNDS = THUMBS.map((thumb) => ({
  id: thumb.split('/').pop().replace(/^thumb_/, '').replace(/\.[^.]+$/, ''),
  thumb,
  full: thumb.replace('/thumb_', '/'),
}))
