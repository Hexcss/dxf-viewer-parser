// src/components/Sidebar.tsx
import type { ChangeEvent } from "react";
import type { DrawingEntity } from "../models";

export type ViewTab = '3D_VIEW' | 'JSON_RENDER';

interface SidebarProps {
  onDxfFileSelect: (e: ChangeEvent<HTMLInputElement>) => void; // Renamed for clarity
  isLoading: boolean;
  loadPhase: string;
  loadProgress: number;
  drawingData: DrawingEntity[] | null;
  onExportModelAsJson: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}

export function Sidebar({
  onDxfFileSelect,
  isLoading,
  loadPhase,
  loadProgress,
  drawingData,
  onExportModelAsJson,
  activeTab,
  onTabChange,
}: SidebarProps) {

  const hasContent = drawingData && drawingData.length > 0;

  const getTabStyle = (tab: ViewTab) => ({
    flex: 1, padding: '10px 15px', border: '1px solid #adb5bd',
    background: activeTab === tab ? '#6c757d' : 'white',
    color: activeTab === tab ? 'white' : 'black',
    cursor: 'pointer', transition: 'background-color 0.2s, color 0.2s',
  });

  return (
    <aside style={{
      width: 280, padding: 16, background: "#f8f9fa",
      borderRight: "1px solid #dee2e6", display: 'flex', flexDirection: 'column', gap: '24px'
    }}>
      <h2 style={{ margin: 0 }}>DXF Tool</h2>
      
      <div>
        <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>View Mode</h3>
        <div style={{ display: 'flex', borderRadius: '5px', overflow: 'hidden' }}>
          <button style={getTabStyle('3D_VIEW')} onClick={() => onTabChange('3D_VIEW')}>
            DXF Viewer
          </button>
          <button style={getTabStyle('JSON_RENDER')} onClick={() => onTabChange('JSON_RENDER')}>
            JSON Render
          </button>
        </div>
      </div>
      
      {/* --- Conditionally show controls based on the active tab --- */}
      {activeTab === '3D_VIEW' && (
        <>
          <div>
            <label htmlFor="file-upload" style={{ fontWeight: 'bold' }}>
              Load DXF File
            </label>
            <input id="file-upload" type="file" accept=".dxf" onChange={onDxfFileSelect} disabled={isLoading} style={{ width: '100%', marginTop: '8px' }} />
          </div>

          {isLoading && (
            <div>
              <p>{loadPhase}… {loadProgress}%</p>
              <progress value={loadProgress} max={100} style={{ width: "100%" }} />
            </div>
          )}

          <div>
            <h3 style={{ fontWeight: 'bold' }}>Actions</h3>
            <button
              style={{ padding: '12px', border: 'none', background: '#0d6efd', color: 'white', width: '100%', cursor: 'pointer', borderRadius: '5px', opacity: isLoading || !hasContent ? 0.5 : 1 }}
              onClick={onExportModelAsJson}
              disabled={isLoading || !hasContent}
              title={hasContent ? "Export the drawing as a .json file" : "Load a DXF file to enable export"}
            >
              Export as JSON
            </button>
          </div>
        </>
      )}

      {activeTab === 'JSON_RENDER' && (
        <div style={{ padding: '12px', background: '#e9ecef', borderRadius: '5px', color: '#495057', marginTop: '8px' }}>
          <p style={{margin: 0, lineHeight: 1.5, fontSize: '0.9rem'}}>
            Use the controls at the top of the canvas to load a <strong>`.json`</strong> file that was previously exported from the DXF Viewer.
          </p>
        </div>
      )}

    </aside>
  );
}