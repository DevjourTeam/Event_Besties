import { useState, useEffect } from 'react'
import { getConfig } from '../config/editorConfig'
import { fetchCanvasDesign, fetchTemplateDesign } from '../services/shopifyStorefront'

export function useDesignLoader() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [design, setDesign] = useState(null)
  const [designType, setDesignType] = useState(null)

  function loadDesign() {
    setLoading(true)
    setError(null)
    const { designId, designType: type } = getConfig()

    Promise.resolve()
      .then(async () => {
        if (type === 'canvas') {
          const d = await fetchCanvasDesign(designId)
          setDesign(d)
        } else if (type === 'template') {
          const d = await fetchTemplateDesign(designId)
          setDesign(d)
        }
        setDesignType(type)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadDesign()
  }, [])

  return { design, designType, loading, error, retry: loadDesign }
}
