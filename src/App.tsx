// src/App.tsx
import { useState } from "react";
import { Sidebar, type ViewTab } from "./components/Sidebar";
import { ViewerCanvas } from "./components/ViewerCanvas";
import { useDxfViewer } from "./hooks/useDxfViewer";
import { WebglCanvas } from "./components/WebglCanvas"; 

function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('3D_VIEW');

  // This hook is now ONLY used for the DXF Viewer tab
  const {
    containerRef,
    handleFile,
    isLoading: isDxfLoading,
    loadProgress,
    loadPhase,
    drawingData,
    exportModelAsJson,
  } = useDxfViewer();

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        onDxfFileSelect={handleFile} 
        isLoading={isDxfLoading}
        loadPhase={loadPhase}
        loadProgress={loadProgress}
        drawingData={drawingData}
        onExportModelAsJson={exportModelAsJson}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === '3D_VIEW' ? (
        <ViewerCanvas
          containerRef={containerRef}
          isLoading={isDxfLoading}
          loadPhase={loadPhase}
          loadProgress={loadProgress}
        />
      ) : (
        <WebglCanvas />
      )}
    </div>
  );
}

export default App;