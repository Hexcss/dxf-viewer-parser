// src/components/WebglCanvas.tsx
import { useWebglRenderer } from '../hooks/useWebglRenderer';
import React, { useRef } from 'react';

export function WebglCanvas() {
  const { canvasRef, handleJsonFile, isLoading, zoomIn, zoomOut, pan } = useWebglRenderer();
  
  const panState = useRef({ isPanning: false, lastX: 0, lastY: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    panState.current = { isPanning: true, lastX: e.clientX, lastY: e.clientY };
    (e.target as HTMLElement).style.cursor = 'grabbing';
  };
  
  const onMouseUp = (e: React.MouseEvent) => {
    panState.current.isPanning = false;
    (e.target as HTMLElement).style.cursor = 'grab';
  };
  
  const onMouseMove = (e: React.MouseEvent) => {
    if (!panState.current.isPanning) return;
    const dx = e.clientX - panState.current.lastX;
    const dy = e.clientY - panState.current.lastY;
    pan(dx, dy);
    panState.current.lastX = e.clientX;
    panState.current.lastY = e.clientY;
  };

  const toolbarStyle: React.CSSProperties = {
    padding: '8px 16px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6',
    display: 'flex', alignItems: 'center', gap: '24px',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={toolbarStyle}>
        <div>
          <label htmlFor="json-upload" style={{ fontWeight: 'bold', marginRight: '8px' }}>Load Drawing JSON:</label>
          <input id="json-upload" type="file" accept=".json" onChange={handleJsonFile} />
        </div>
        <div>
          <button onClick={zoomIn} style={{ marginRight: '4px' }}>Zoom In</button>
          <button onClick={zoomOut}>Zoom Out</button>
          <span style={{ marginLeft: '16px', color: '#666', fontSize: '0.9em' }}>Click and drag to pan.</span>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', cursor: 'grab' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', position: 'absolute' }}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp} // Stop panning if mouse leaves canvas
          onMouseMove={onMouseMove}
        />
        {isLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <h2>Processing massive file in background...</h2>
          </div>
        )}
      </div>
    </div>
  );
}