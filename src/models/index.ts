export interface DrawingEntity {
  id: string;
  type: 'Line' | 'Point';
  layer: string;
  color: string;
  vertices: { x: number; y: number; z: number }[];
}