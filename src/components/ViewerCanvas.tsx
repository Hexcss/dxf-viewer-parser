// src/components/ViewerCanvas.tsx
import { type RefObject } from "react";

// The interface is simplified as it no longer needs to know about editing modes.
interface ViewerCanvasProps {
  containerRef: RefObject<HTMLDivElement>;
  isLoading: boolean;
  loadPhase: string;
  loadProgress: number;
}

export function ViewerCanvas({
  containerRef,
  isLoading,
  loadPhase,
  loadProgress,
}: ViewerCanvasProps) {
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        background: '#e9ecef',
        // A standard cursor is now used, as editing is not part of this workflow.
        // 'grab' is a good default for a pannable view.
        cursor: 'grab',
      }}
    >
      {isLoading && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0, 0, 0, 0.6)",
          zIndex: 10,
          color: 'white',
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 48, height: 48,
              border: "6px solid rgba(255, 255, 255, 0.2)",
              borderTopColor: "#ffffff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }} />
            <div style={{ fontSize: '1.1rem' }}>{loadPhase}… {loadProgress}%</div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        div:active { cursor: grabbing; } /* Optional: nice UX for when user is panning */
      `}</style>
    </div>
  );
}