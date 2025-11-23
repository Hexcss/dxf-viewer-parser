// src/types/drawing-entity.ts
export type DrawingEntityType = 'Line' | 'Point'

export type Vec3 = { x: number; y: number; z: number }

export type DrawingEntity = {
  id: string
  type: DrawingEntityType
  layer: string
  color: string
  vertices: Vec3[]
}
