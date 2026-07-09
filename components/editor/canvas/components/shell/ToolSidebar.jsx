import { useEffect, useRef, useState } from 'react'
import { useEditorState, useEditorApi } from '../../editor/EditorProvider'
import UploadPanel from './panels/UploadPanel'
import ImageEditPanel from './panels/ImageEditPanel'
import ImageAdjustPanel from './panels/ImageAdjustPanel'
import CropPanel from './panels/CropPanel'
import FilterPanel from './panels/FilterPanel'
import TextPanel from './panels/TextPanel'
import ShapeLibraryPanel from './panels/ShapeLibraryPanel'
import ShapeEditPanel from './panels/ShapeEditPanel'
import ClipartLibraryPanel from './panels/ClipartLibraryPanel'

const TOOLS = [
  {
    id: 'designs',
    title: 'Add Designs',
    sub: 'Cliparts, shapes, draw, etc',
    icon: 'designs',
    children: [
      { id: 'clipart', label: 'Clipart library', icon: 'cliparts' },
      { id: 'backgrounds', label: 'Backgrounds', icon: 'background' },
      { id: 'shapes', label: 'Shapes library', icon: 'shapes' },
      { id: 'gallery', label: 'Gallery', icon: 'gallery' },
      { id: 'qrcode', label: 'QR CODE', icon: 'barcode' },
    ],
  },
  { id: 'upload', title: 'Upload design', sub: 'Browse or import', icon: 'upload' },
  { id: 'text', title: 'Add Text', sub: 'Add your text here', icon: 'text' },
  { id: 'ideas', title: 'Design Ideas', sub: 'Ready to use templates', icon: 'template' },
]

export default function ToolSidebar() {
  const { activeTool, selection } = useEditorState()
  const api = useEditorApi()
  const [activeSub, setActiveSub] = useState(null)
  const [imgView, setImgView] = useState('main') // 'main' | 'adjust'

  const isImageSelected = selection.count === 1 && selection.kind === 'image'
  const isTextSelected = selection.count === 1 && selection.kind === 'text'
  const isShapeSelected = selection.count === 1 && selection.kind === 'shape'

  // when the image is deselected, drop back to the main image view
  useEffect(() => {
    if (!isImageSelected) setImgView('main')
  }, [isImageSelected])

  // When focus leaves an element (selection cleared), drop any open panel tool
  // so we fall back to the main menu — but NOT before the user has created
  // anything (so clicking "Add Text" still opens its empty panel).
  const hadSelection = useRef(false)
  useEffect(() => {
    if (selection.count > 0) hadSelection.current = true
    else if (hadSelection.current && activeTool) {
      hadSelection.current = false
      api.setTool(null)
    }
  }, [selection.count]) // eslint-disable-line react-hooks/exhaustive-deps

  const onTool = (tool) => {
    api.setTool(tool.id) // toggles open/closed (accordion: only one open at a time)
  }

  const onSub = (subId) => {
    setActiveSub(subId)
    // Sub-panels (clipart grid, backgrounds, shapes, gallery, QR) wire in next.
  }

  // Clipart library stays open while browsing/adding (takes priority over a
  // just-added image's editor, matching the reference).
  if (activeSub === 'clipart') {
    return (
      <aside className="ps-sidebar">
        <ClipartLibraryPanel onBack={() => setActiveSub(null)} />
      </aside>
    )
  }

  // A selected shape shows the shape editor.
  if (isShapeSelected) {
    return (
      <aside className="ps-sidebar">
        <ShapeEditPanel />
      </aside>
    )
  }

  // Shapes library (from Add Designs → Shapes library)
  if (activeSub === 'shapes') {
    return (
      <aside className="ps-sidebar">
        <ShapeLibraryPanel onBack={() => setActiveSub(null)} />
      </aside>
    )
  }

  // Selecting an image overrides everything: show the image-editing panels.
  if (isImageSelected) {
    return (
      <aside className="ps-sidebar">
        {imgView === 'adjust' && <ImageAdjustPanel onBack={() => setImgView('main')} />}
        {imgView === 'crop' && <CropPanel onBack={() => setImgView('main')} />}
        {imgView === 'filter' && <FilterPanel onBack={() => setImgView('main')} />}
        {imgView === 'main' && (
          <ImageEditPanel
            onEdit={() => setImgView('adjust')}
            onCrop={() => setImgView('crop')}
            onFilter={() => setImgView('filter')}
          />
        )}
      </aside>
    )
  }

  // Full-panel tools replace the whole sidebar (with a Back button).
  if (activeTool === 'upload') {
    return (
      <aside className="ps-sidebar">
        <UploadPanel onBack={() => api.setTool('upload')} />
      </aside>
    )
  }
  if (isTextSelected || activeTool === 'text') {
    return (
      <aside className="ps-sidebar">
        <TextPanel />
      </aside>
    )
  }

  return (
    <aside className="ps-sidebar">
      <h2 className="ps-sidebar__title">Create Your Design</h2>

      {TOOLS.map((tool) => {
        const open = activeTool === tool.id && !!tool.children
        return (
          <div className="ps-tool-group" key={tool.id}>
            <button
              type="button"
              className={`ps-tool${activeTool === tool.id ? ' is-active' : ''}`}
              onClick={() => onTool(tool)}
              aria-expanded={tool.children ? open : undefined}
            >
              <span className="ps-tool__icon">
                <i className={`nxi nxi-${tool.icon}`} aria-hidden="true" />
              </span>
              <span className="ps-tool__text">
                <span className="ps-tool__title">{tool.title}</span>
                <span className="ps-tool__sub">{tool.sub}</span>
              </span>
            </button>

            {tool.children && (
              <div className={`ps-subwrap${open ? ' is-open' : ''}`}>
                <div className="ps-subwrap__inner">
                  <div className="ps-sublist">
                    {tool.children.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`ps-subitem${activeSub === c.id ? ' is-active' : ''}`}
                        onClick={() => onSub(c.id)}
                      >
                        <span className="ps-subitem__icon">
                          <i className={`nxi nxi-${c.icon}`} aria-hidden="true" />
                        </span>
                        <span className="ps-subitem__label">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </aside>
  )
}
