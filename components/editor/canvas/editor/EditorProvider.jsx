import { createContext, useContext, useMemo, useReducer, useRef, useCallback } from 'react'
/* eslint-disable react-refresh/only-export-components */

/**
 * EditorProvider — the engine's "document" + UI state.
 *
 * The engine is product-agnostic: it loads a `document` descriptor
 * (shape + real-world size + background) and clips everything to it.
 * Any product (sailboard arch, circle, bear cutout, plain rect) is just
 * a different document. The CanvasStage registers an imperative `api`
 * (addText/addImage/export/…) that the toolbar & bottom bar call.
 */

const DEFAULT_DOC = {
  id: null,
  name: 'Untitled',
  // shape that defines the printable/clip area. null svgPath = full rectangle.
  shape: { type: 'rect', svgPath: null },
  // real-world print size, used for dimension overlays + export scaling
  sizeCm: { w: 100, h: 200 },
  dpi: 150,
  // full-bleed background that fills the shape
  background: { type: 'none', value: null },
  // optional product mockup photo shown behind the shape as context (never printed).
  // null = bare shape. Set per-product when the data provides one ("whatever product comes").
  mockup: null,
}

const initialState = {
  doc: DEFAULT_DOC,
  activeTool: null, // 'designs' | 'upload' | 'text' | 'ideas' | null
  // rich selection info, kept in sync by CanvasStage
  selection: { ids: [], kind: null, count: 0, wCm: 0, hCm: 0, src: null, origSrc: null },
  layers: [], // mirror of canvas objects, top-most first
  canUndo: false,
  canRedo: false,
  ready: false,
  recentUploads: [], // { id, name, dataURL } — persists while the app is open
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_DOC':
      return { ...state, doc: { ...DEFAULT_DOC, ...action.doc }, ready: true }
    case 'SET_TOOL':
      return { ...state, activeTool: state.activeTool === action.tool ? null : action.tool }
    case 'SET_SELECTION':
      return { ...state, selection: action.selection }
    case 'SET_LAYERS':
      return { ...state, layers: action.layers }
    case 'SET_HISTORY':
      return { ...state, canUndo: action.canUndo, canRedo: action.canRedo }
    case 'PATCH_DOC':
      return { ...state, doc: { ...state.doc, ...action.patch } }
    case 'ADD_UPLOAD':
      return {
        ...state,
        recentUploads: [action.item, ...state.recentUploads].slice(0, 12),
      }
    default:
      return state
  }
}

const EditorStateCtx = createContext(null)
const EditorApiCtx = createContext(null)

export function EditorProvider({ initialDoc, children }) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    doc: { ...DEFAULT_DOC, ...(initialDoc || {}) },
  })

  // Imperative bridge: CanvasStage fills this with real implementations.
  const canvasApiRef = useRef({
    addText: () => {},
    addImage: () => {},
    addShape: () => {},
    setBackground: () => {},
    deleteSelected: () => {},
    undo: () => {},
    redo: () => {},
    exportPNG: async () => null,
    exportPDF: async () => null,
  })

  // stable registrar so CanvasStage can swap in real methods once mounted
  const registerCanvas = useCallback((methods) => {
    canvasApiRef.current = { ...canvasApiRef.current, ...methods }
  }, [])

  const api = useMemo(
    () => ({
      loadDoc: (doc) => dispatch({ type: 'LOAD_DOC', doc }),
      patchDoc: (patch) => dispatch({ type: 'PATCH_DOC', patch }),
      setTool: (tool) => dispatch({ type: 'SET_TOOL', tool }),
      setSelection: (selection) => dispatch({ type: 'SET_SELECTION', selection }),
      setLayers: (layers) => dispatch({ type: 'SET_LAYERS', layers }),
      setHistory: (canUndo, canRedo) => dispatch({ type: 'SET_HISTORY', canUndo, canRedo }),
      addUpload: (item) => dispatch({ type: 'ADD_UPLOAD', item }),
      // canvas imperative handle (registered by CanvasStage)
      canvas: canvasApiRef,
      registerCanvas,
    }),
    [registerCanvas]
  )

  return (
    <EditorStateCtx.Provider value={state}>
      <EditorApiCtx.Provider value={api}>{children}</EditorApiCtx.Provider>
    </EditorStateCtx.Provider>
  )
}

export function useEditorState() {
  const ctx = useContext(EditorStateCtx)
  if (!ctx) throw new Error('useEditorState must be used inside EditorProvider')
  return ctx
}

export function useEditorApi() {
  const ctx = useContext(EditorApiCtx)
  if (!ctx) throw new Error('useEditorApi must be used inside EditorProvider')
  return ctx
}
