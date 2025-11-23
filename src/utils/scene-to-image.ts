// src/utils/scene-to-image.ts
import * as THREE from 'three'

type ImageOptions = {
  width: number
  height: number
  background?: THREE.Color | string | number | null
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
  margin?: number
}

const getBounds = (scene: THREE.Scene) => {
  const box = new THREE.Box3()
  scene.updateMatrixWorld(true)
  box.setFromObject(scene)
  if (!isFinite(box.min.x) || !isFinite(box.max.x)) box.set(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))
  return box
}

const makeOrthoForBounds = (box: THREE.Box3, targetAspect: number) => {
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const depth = Math.max(size.z, 1)
  let halfH = size.y * 0.5
  let halfW = size.x * 0.5
  const boxAspect = size.x / Math.max(size.y, 1e-6)
  if (boxAspect > targetAspect) {
    halfH = (halfW / targetAspect)
  } else {
    halfW = (halfH * targetAspect)
  }
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, depth + 10000)
  cam.position.set(center.x, center.y, box.max.z + 1000)
  cam.lookAt(center.x, center.y, center.z)
  cam.updateProjectionMatrix()
  cam.updateMatrixWorld(true)
  return cam
}

export const sceneToImage = async (scene: THREE.Scene, opts: ImageOptions) => {
  const width = Math.max(1, Math.floor(opts.width))
  const height = Math.max(1, Math.floor(opts.height))
  const margin = Math.max(0, opts.margin ?? 0)
  const mimeType = opts.mimeType ?? 'image/png'
  const quality = opts.quality ?? 0.92
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: opts.background == null })
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  if (opts.background != null) renderer.setClearColor(new THREE.Color(opts.background as any))
  const sceneClone = scene
  const box = getBounds(sceneClone)
  if (margin > 0) {
    const grow = new THREE.Vector3(margin, margin, 0)
    box.expandByVector(grow)
  }
  const camera = makeOrthoForBounds(box, width / height)
  renderer.render(sceneClone, camera)
  const canvas = renderer.domElement
  const dataUrl = canvas.toDataURL(mimeType, quality)
  const blob: Blob = await new Promise(resolve => canvas.toBlob(b => resolve(b || new Blob()), mimeType, quality))
  renderer.dispose()
  return { blob, dataUrl }
}
