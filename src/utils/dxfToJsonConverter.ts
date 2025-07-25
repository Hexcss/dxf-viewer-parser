import * as THREE from "three";

export interface DrawingEntity {
  id: string;
  type: 'Line' | 'Point';
  layer: string;
  color: string;
  vertices: { x: number; y: number; z: number }[];
}

const PRECISION = 4; // Decimal places for coordinate rounding

const getColorFromMaterial = (material: any): string => {
  try {
    if (Array.isArray(material)) {
      const firstWithColor = material.find(m => m?.color);
      return firstWithColor ? `#${firstWithColor.color.getHexString()}` : '#000000';
    }
    return material?.color ? `#${material.color.getHexString()}` : '#000000';
  } catch {
    return '#000000';
  }
};

const roundCoordinate = (value: number): number => {
  const factor = Math.pow(10, PRECISION);
  return Math.round(value * factor) / factor;
};

export const convertSceneToModel = (scene: THREE.Scene): DrawingEntity[] => {
  const model: DrawingEntity[] = [];
  const edgeMap = new Map<string, boolean>();

  // Process all children directly for better control
  scene.children.forEach((node: any) => {
    console.log(node);
    if (!node.geometry) return;

    const geometry = node.geometry;
    const position = geometry.attributes?.position || geometry.getAttribute?.('position');
    if (!position || position.count === 0) return;

    const color = getColorFromMaterial(node.material);
    const layer = node.layer?.toString() || node.layers?.mask?.toString() || '0';
    const index = geometry.index || geometry.getAttribute?.('index');
    const is2D = position.itemSize === 2;

    // Handle Points
    if (node instanceof THREE.Points || node.type === 'Points') {
      for (let i = 0; i < position.count; i++) {
        const idx = index ? index.getX(i) : i;
        model.push({
          id: `${node.uuid}-pt-${i}`,
          type: 'Point',
          layer,
          color,
          vertices: [{
            x: roundCoordinate(position.getX(idx)),
            y: roundCoordinate(position.getY(idx)),
            z: is2D ? 0 : roundCoordinate(position.getZ(idx))
          }]
        });
      }
      return;
    }

    // Handle LineSegments
    if (node instanceof THREE.LineSegments || node.type === 'LineSegments') {
      const vertexCount = index ? index.count : position.count;
      
      for (let i = 0; i < vertexCount; i += 2) {
        if (i + 1 >= vertexCount) break;
        
        const i1 = index ? index.getX(i) : i;
        const i2 = index ? index.getX(i + 1) : i + 1;
        
        model.push({
          id: `${node.uuid}-${i}`,
          type: 'Line',
          layer,
          color,
          vertices: [
            { 
              x: roundCoordinate(position.getX(i1)), 
              y: roundCoordinate(position.getY(i1)), 
              z: is2D ? 0 : roundCoordinate(position.getZ(i1))
            },
            { 
              x: roundCoordinate(position.getX(i2)), 
              y: roundCoordinate(position.getY(i2)), 
              z: is2D ? 0 : roundCoordinate(position.getZ(i2))
            }
          ]
        });
      }
      return;
    }

    // Handle Meshes
    try {
      const edges = new THREE.EdgesGeometry(geometry);
      const edgePositions = edges.getAttribute('position');
      
      for (let i = 0; i < edgePositions.count; i += 2) {
        const x1 = roundCoordinate(edgePositions.getX(i));
        const y1 = roundCoordinate(edgePositions.getY(i));
        const z1 = roundCoordinate(edgePositions.getZ(i));
        const x2 = roundCoordinate(edgePositions.getX(i + 1));
        const y2 = roundCoordinate(edgePositions.getY(i + 1));
        const z2 = roundCoordinate(edgePositions.getZ(i + 1));
        
        const key = `${x1},${y1},${z1},${x2},${y2},${z2}`;
        
        if (!edgeMap.has(key)) {
          edgeMap.set(key, true);
          
          model.push({
            id: `${node.uuid}-edge-${i}`,
            type: 'Line',
            layer,
            color,
            vertices: [
              { x: x1, y: y1, z: is2D ? 0 : z1 },
              { x: x2, y: y2, z: is2D ? 0 : z2 }
            ]
          });
        }
      }
    } catch (e) {
      console.warn('EdgesGeometry failed, falling back to direct processing', e);
      
      // Fallback for non-standard geometries
      const vertexCount = index ? index.count : position.count;
      const isLikelyTriangles = vertexCount % 3 === 0;

      if (isLikelyTriangles) {
        // Process as triangles
        const triangleCount = Math.floor(vertexCount / 3);
        for (let i = 0; i < triangleCount; i++) {
          const baseIdx = i * 3;
          const indices = [
            index ? index.getX(baseIdx) : baseIdx,
            index ? index.getX(baseIdx + 1) : baseIdx + 1,
            index ? index.getX(baseIdx + 2) : baseIdx + 2
          ];

          // Create edges for each triangle
          const edges = [
            { 
              key: `${indices[0]},${indices[1]}`,
              vertices: [indices[0], indices[1]]
            },
            { 
              key: `${indices[1]},${indices[2]}`,
              vertices: [indices[1], indices[2]]
            },
            { 
              key: `${indices[2]},${indices[0]}`,
              vertices: [indices[2], indices[0]]
            }
          ];

          edges.forEach(({key, vertices: [i1, i2]}) => {
            if (!edgeMap.has(key)) {
              edgeMap.set(key, true);
              
              model.push({
                id: `${node.uuid}-t${i}-${key}`,
                type: 'Line',
                layer,
                color,
                vertices: [
                  { 
                    x: roundCoordinate(position.getX(i1)), 
                    y: roundCoordinate(position.getY(i1)), 
                    z: is2D ? 0 : roundCoordinate(position.getZ(i1))
                  },
                  { 
                    x: roundCoordinate(position.getX(i2)), 
                    y: roundCoordinate(position.getY(i2)), 
                    z: is2D ? 0 : roundCoordinate(position.getZ(i2))
                  }
                ]
              });
            }
          });
        }
      } else {
        // Generic fallback for non-triangle geometry
        for (let i = 0; i < vertexCount - 1; i++) {
          const i1 = index ? index.getX(i) : i;
          const i2 = index ? index.getX(i + 1) : i + 1;
          
          model.push({
            id: `${node.uuid}-g${i}`,
            type: 'Line',
            layer,
            color,
            vertices: [
              { 
                x: roundCoordinate(position.getX(i1)), 
                y: roundCoordinate(position.getY(i1)), 
                z: is2D ? 0 : roundCoordinate(position.getZ(i1))
              },
              { 
                x: roundCoordinate(position.getX(i2)), 
                y: roundCoordinate(position.getY(i2)), 
                z: is2D ? 0 : roundCoordinate(position.getZ(i2))
              }
            ]
          });
        }
      }
    }
  });

  console.log(`Converted ${scene.children.length} scene children to ${model.length} entities`);
  return model;
};