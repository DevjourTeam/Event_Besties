import { createRoot } from 'react-dom/client'
import App from './App'

/**
 * Mounts the editor into #design-editor.
 *
 * Note: the legacy `/view` AdminView (Fabric v5) is retired during the
 * Photoshop-engine rebuild. It can be re-introduced on the new engine later.
 */
function mount() {
  const container = document.getElementById('design-editor')
  if (!container) return
  const root = createRoot(container)
  root.render(<App />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
