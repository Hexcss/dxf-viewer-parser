// src/hooks/useDxfViewer.ts
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import * as THREE from 'three'
import { DxfViewer } from 'dxf-viewer'
import { sceneToImage } from '../utils/scene-to-image'

const PHASE_LABELS: Record<string, string> = { fetch: 'Downloading', parse: 'Parsing', prepare: 'Preparing', font: 'Loading Fonts' }

const countRenderable = (scene: THREE.Scene) => {
  let meshes = 0, lines = 0, points = 0, geoms = 0, verts = 0, indexed = 0
  scene.traverse(o => {
    const anyO = o as any
    const g: THREE.BufferGeometry | undefined = anyO.geometry
    if (g) {
      geoms++
      const pos = g.getAttribute?.('position')
      const idx = g.getIndex?.()
      if (pos) verts += pos.count || 0
      if (idx) indexed += idx.count || 0
    }
    if ((o as THREE.Mesh).isMesh) meshes++
    else if ((o as THREE.Line).isLine || (o as THREE.LineSegments).isLineSegments) lines++
    else if ((o as THREE.Points).isPoints) points++
  })
  return { meshes, lines, points, geoms, verts, indexed }
}

const hasRenderableContent = (scene: THREE.Scene) => {
  let found = false
  scene.traverse(o => {
    const anyO = o as any
    const g: THREE.BufferGeometry | undefined = anyO.geometry
    if (!g) return
    const pos = g.getAttribute?.('position')
    const idx = g.getIndex?.()
    if (
      ((o as THREE.Mesh).isMesh || (o as THREE.Line).isLine || (o as THREE.Points).isPoints) &&
      ((pos && pos.count > 0) || (idx && idx.count > 0))
    ) {
      found = true
    }
  })
  return found
}

export function useDxfViewer() {
  const containerRef = useRef<HTMLDivElement>(null!)
  const viewerRef = useRef<DxfViewer | null>(null)
  const urlRef = useRef<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadPhase, setLoadPhase] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isSceneLoaded, setIsSceneLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    console.log('[DXF] Mounting viewer...')
    const viewer = new DxfViewer(containerRef.current, { autoResize: true, antialias: true, clearColor: new THREE.Color(0xf0f0f0) })
    viewerRef.current = viewer
    setIsSceneLoaded(false)
    console.log('[DXF] Viewer created', { hasGetScene: typeof (viewer as any).GetScene === 'function', keys: Object.keys(viewer as any) })
    return () => {
      console.log('[DXF] Unmounting viewer, destroying resources...')
      viewer.Destroy()
      viewerRef.current = null
      setIsSceneLoaded(false)
      if (urlRef.current) {
        console.log('[DXF] Revoking object URL on unmount:', urlRef.current)
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    console.log('[DXF] isSceneLoaded ->', isSceneLoaded)
  }, [isSceneLoaded])

  const recomputeLoadedFlag = (origin?: string) => {
    const v = viewerRef.current
    if (!v) {
      console.log('[DXF] recomputeLoadedFlag skipped (no viewer)', { origin })
      setIsSceneLoaded(false)
      return
    }
    const scene = v.GetScene()
    scene.updateMatrixWorld(true)
    const stats = countRenderable(scene)
    const found = hasRenderableContent(scene)
    console.log('[DXF] recomputeLoadedFlag', { origin, found, stats, sceneChildren: scene.children.length })
    setIsSceneLoaded(found)
  }

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !viewerRef.current) {
      console.log('[DXF] handleFile aborted (no file or no viewer)')
      return
    }
    if (urlRef.current) {
      console.log('[DXF] Revoking previous object URL before new load:', urlRef.current)
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    const objectUrl = URL.createObjectURL(file)
    urlRef.current = objectUrl
    console.log('[DXF] Starting load for file:', { name: file.name, size: file.size, type: file.type, objectUrl })

    setIsLoading(true)
    setImageUrl(null)
    setLoadProgress(0)
    setLoadPhase('Initializing')
    setIsSceneLoaded(false)

    const viewer = viewerRef.current
    try {
      await viewer.Load({
        url: objectUrl,
        fonts: [],
        progressCbk: (phase, processedSize, totalSize) => {
          const label = PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? String(phase)
          const pct = totalSize > 0 ? Math.round((processedSize * 100) / totalSize) : 0
          console.log('[DXF] progress', { phase, label, processedSize, totalSize, pct })
          setLoadPhase(label)
          setLoadProgress(pct)
          if ((phase === 'prepare' || phase === 'parse') && totalSize > 0 && pct >= 99) {
            requestAnimationFrame(() => recomputeLoadedFlag('progress>=99'))
          }
        },
        workerFactory: undefined
      })
      console.groupCollapsed('[DXF] Load resolved')
      try {
        const scene = viewer.GetScene()
        const stats = countRenderable(scene)
        console.log('scene stats @resolve', { stats, children: scene.children.length })
      } finally {
        console.groupEnd()
      }
      recomputeLoadedFlag('afterLoad')
      setIsLoading(false)
      setTimeout(() => recomputeLoadedFlag('setTimeout(0)'), 0)
      requestAnimationFrame(() => recomputeLoadedFlag('rAF'))
      setTimeout(() => recomputeLoadedFlag('setTimeout(16)'), 16)
    } catch (err) {
      console.error('[DXF] Load failed', err)
      setLoadPhase('Error')
      setIsLoading(false)
      setIsSceneLoaded(false)
    }
  }

  const exportImage = async (
    width: number,
    height: number,
    opts?: { background?: string | number | THREE.Color; mimeType?: 'image/png' | 'image/jpeg' | 'image/webp'; quality?: number; margin?: number; filename?: string }
  ) => {
    const v = viewerRef.current
    if (!v) {
      console.warn('[DXF] exportImage called without viewer')
      return
    }
    console.log('[DXF] exportImage start', { width, height, opts })
    const scene = v.GetScene()
    scene.updateMatrixWorld(true)
    const stats = countRenderable(scene)
    console.log('[DXF] exportImage scene stats', stats)
    const { blob, dataUrl } = await sceneToImage(scene, { width, height, background: opts?.background ?? 0xffffff, mimeType: opts?.mimeType, quality: opts?.quality, margin: opts?.margin ?? 8 })
    setImageUrl(dataUrl)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = opts?.filename ?? `drawing_${width}x${height}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
      console.log('[DXF] exportImage revoked blob URL')
    }, 1000)
  }

  return { containerRef, handleFile, isLoading, loadProgress, loadPhase, imageUrl, exportImage, isSceneLoaded }
}
