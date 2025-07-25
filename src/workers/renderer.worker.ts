// src/workers/renderer.worker.ts

// --- THE FIX ---
// This directive explicitly tells the TypeScript language server which type
// library to use for this file, overriding any incorrect global defaults.
/// <reference lib="webworker" />

self.onmessage = (event: MessageEvent<any>) => {
  console.log('[Worker] Received file data for chunked processing.');
  try {
    const drawingData = event.data;
    
    if (!drawingData || !Array.isArray(drawingData) || drawingData.length === 0) {
      self.postMessage({ type: 'error', payload: 'Invalid or empty drawing data.' });
      return;
    }

    const totalLines = drawingData.length;
    const chunkSize = 1_000_000;

    self.postMessage({ type: 'initialize', payload: { totalLines } });
    
    for (let i = 0; i < totalLines; i += chunkSize) {
      const chunk = drawingData.slice(i, i + chunkSize);
      
      const positions = new Float32Array(chunk.length * 4);
      const colors = new Uint8ClampedArray(chunk.length * 8);
      
      chunk.forEach((entity, j) => {
        if (!entity.vertices || entity.vertices.length < 2) return;

        const posIndex = j * 4;
        const colorIndex = j * 8;
        const start = entity.vertices[0];
        const end = entity.vertices[1];

        positions[posIndex] = start.x;
        positions[posIndex + 1] = start.y;
        positions[posIndex + 2] = end.x;
        positions[posIndex + 3] = end.y;

        let r=0, g=0, b=0;
        try {
          r = parseInt(entity.color.slice(1, 3), 16);
          g = parseInt(entity.color.slice(3, 5), 16);
          b = parseInt(entity.color.slice(5, 7), 16);
        } catch {}
        
        colors.set([r, g, b, 255, r, g, b, 255], colorIndex);
      });

      // With the directive above, this call is now correctly typed and will not error.
      self.postMessage(
        {
          type: 'chunk',
          payload: { positions, colors, offset: i },
        },
        [positions.buffer, colors.buffer]
      );
    }
    
    self.postMessage({ type: 'done' });

  } catch (e: any) {
    self.postMessage({ type: 'error', payload: e.message });
  }
};