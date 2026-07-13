/**
 * CANVAS BACKDROP — the room photo behind the print surface, so the customer can
 * see how big the board actually is.
 *
 * CONTEXT ONLY, never printed: it is a plain DOM <img> behind the Fabric canvas,
 * and renderPrint() exports the Fabric canvas cropped to the print rect, so
 * nothing here can reach the print file.
 *
 * The room is framed AROUND the board rather than drawn at true metric scale.
 * True scale cannot work here: the stage always fits the board to the viewport,
 * so an 80cm sign is drawn as large on screen as a 210cm arch. Sizing the room
 * off centimetres then makes it several times the board, and since the viewport
 * cannot zoom out you only see a cropped, zoomed-in slice of wall. The real
 * dimensions are already given by the cm labels; the room is there for context.
 *
 * So: the board always stands on the floor line and fills a fixed share of the
 * wall, which frames every shape the same way the reference does.
 *
 * The photo is an EMPTY room: it contains no product, so it works behind any
 * shape. (The earlier one had an arch board baked in, which poked out from
 * behind circles and banners.)
 */
const SRC = '/canvas-backdrop.webp'
const IMG_ASPECT = 1254 / 1254 // square
const FLOOR = 0.8756 // wall/floor junction, as a fraction of image height
const WALL_FILL = 0.85 // how much of the wall a tall board takes up
const SIDE_ROOM = 1.35 // how much wider than the board the room must be

export default function CanvasBackdrop({ printW, printH, printLeft, printTop }) {
  if (!printW || !printH) return null

  // Big enough that the board fills WALL_FILL of the wall, AND that there is
  // room either side of it. Whichever constraint is tighter wins, so tall boards
  // and wide banners are both framed sensibly.
  const h = Math.max(printH / (FLOOR * WALL_FILL), (printW * SIDE_ROOM) / IMG_ASPECT)
  const w = h * IMG_ASPECT

  // stand the board on the floor line, centred left-to-right
  const left = printLeft + printW / 2 - w / 2
  const top = printTop + printH - FLOOR * h

  return (
    <img
      className="ps-backdrop"
      src={SRC}
      alt=""
      draggable={false}
      style={{ left: Math.round(left), top: Math.round(top), width: Math.round(w), height: Math.round(h) }}
    />
  )
}
