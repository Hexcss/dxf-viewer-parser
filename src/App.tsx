// src/App.tsx
import { useState } from "react";
import { Sidebar, type ViewTab } from "./components/Sidebar";
import { ViewerCanvas } from "./components/ViewerCanvas";
import { useDxfViewer } from "./hooks/useDxfViewer";
import { WebglCanvas } from "./components/WebglCanvas";

function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>("3D_VIEW");

  const {
    containerRef,
    handleFile,
    isLoading,
    loadProgress,
    loadPhase,
    imageUrl,
    exportImage,
    isSceneLoaded,
  } = useDxfViewer();

  console.log("[APP]", { activeTab, isLoading, isSceneLoaded, loadPhase, loadProgress });

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        onDxfFileSelect={handleFile}
        isLoading={isLoading}
        loadPhase={loadPhase}
        loadProgress={loadProgress}
        isSceneLoaded={isSceneLoaded}
        onExportImage={exportImage}
        imageUrl={imageUrl}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "3D_VIEW" ? (
        <ViewerCanvas
          containerRef={containerRef}
          isLoading={isLoading}
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
