// src/components/Sidebar.tsx
import { useState } from 'react'
import type { ChangeEvent } from 'react'

export type ViewTab = '3D_VIEW'

type ExportImageOptions = {
  background?: string | number
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
  margin?: number
  filename?: string
}

interface SidebarProps {
  onDxfFileSelect: (e: ChangeEvent<HTMLInputElement>) => void
  isLoading: boolean
  loadPhase: string
  loadProgress: number
  isSceneLoaded: boolean
  onExportImage: (width: number, height: number, opts?: ExportImageOptions) => void | Promise<void>
  imageUrl?: string | null
  activeTab: ViewTab
  onTabChange: (tab: ViewTab) => void
}

export function Sidebar({
  onDxfFileSelect,
  isLoading,
  loadPhase,
  loadProgress,
  isSceneLoaded,
  onExportImage,
  imageUrl,
  activeTab,
  onTabChange
}: SidebarProps) {
  const [imgW, setImgW] = useState<number>(1920)
  const [imgH, setImgH] = useState<number>(1080)
  const [bg, setBg] = useState<string>('#ffffff')
  const [mime, setMime] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png')
  const [quality, setQuality] = useState<number>(92)
  const [margin, setMargin] = useState<number>(8)
  const [filename, setFilename] = useState<string>('drawing.png')

  const getTabStyle = (tab: ViewTab) => ({
    flex: 1,
    padding: '10px 15px',
    border: '1px solid #adb5bd',
    background: activeTab === tab ? '#6c757d' : 'white',
    color: activeTab === tab ? 'white' : 'black',
    cursor: 'pointer',
    transition: 'background-color 0.2s, color 0.2s'
  })

  return (
    <aside style={{ width: 320, padding: 16, background: '#f8f9fa', borderRight: '1px solid #dee2e6', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ margin: 0 }}>DXF Tool</h2>
      <div>
        <h3 style={{ marginTop: 0, fontWeight: 'bold' }}>View Mode</h3>
        <div style={{ display: 'flex', borderRadius: 5, overflow: 'hidden' }}>
          <button style={getTabStyle('3D_VIEW')} onClick={() => onTabChange('3D_VIEW')}>DXF Viewer</button>
        </div>
      </div>
      {activeTab === '3D_VIEW' && (
        <>
          <div>
            <label htmlFor="file-upload" style={{ fontWeight: 'bold' }}>Load DXF File</label>
            <input id="file-upload" type="file" accept=".dxf" onChange={onDxfFileSelect} disabled={isLoading} style={{ width: '100%', marginTop: 8 }} />
          </div>
          {isLoading && (
            <div>
              <p>{loadPhase}… {loadProgress}%</p>
              <progress value={loadProgress} max={100} style={{ width: '100%' }} />
            </div>
          )}
          <div>
            <h3 style={{ fontWeight: 'bold' }}>Export Image</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#495057' }}>Width</label>
                <input type="number" min={1} value={imgW} onChange={e => setImgW(parseInt(e.target.value || '0', 10))} style={{ width: '100%', padding: 8, border: '1px solid #ced4da', borderRadius: 4 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#495057' }}>Height</label>
                <input type="number" min={1} value={imgH} onChange={e => setImgH(parseInt(e.target.value || '0', 10))} style={{ width: '100%', padding: 8, border: '1px solid #ced4da', borderRadius: 4 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#495057' }}>Background</label>
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} style={{ width: '100%', height: 40, padding: 0, border: '1px solid #ced4da', borderRadius: 4 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#495057' }}>Format</label>
                <select value={mime} onChange={e => setMime(e.target.value as any)} style={{ width: '100%', padding: 8, border: '1px solid #ced4da', borderRadius: 4 }}>
                  <option value="image/png">PNG</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/webp">WEBP</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#495057' }}>Quality (%)</label>
                <input type="number" min={1} max={100} value={quality} onChange={e => setQuality(parseInt(e.target.value || '92', 10))} style={{ width: '100%', padding: 8, border: '1px solid #ced4da', borderRadius: 4 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#495057' }}>Margin (px)</label>
                <input type="number" min={0} value={margin} onChange={e => setMargin(parseInt(e.target.value || '0', 10))} style={{ width: '100%', padding: 8, border: '1px solid #ced4da', borderRadius: 4 }} />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                <label style={{ display: 'block', fontSize: 12, color: '#495057' }}>Filename</label>
                <input type="text" value={filename} onChange={e => setFilename(e.target.value)} style={{ width: '100%', padding: 8, border: '1px solid #ced4da', borderRadius: 4 }} />
              </div>
            </div>
            <button
              style={{ marginTop: 10, padding: 12, border: 'none', background: '#198754', color: 'white', width: '100%', cursor: 'pointer', borderRadius: 5, opacity: isLoading || !isSceneLoaded ? 0.5 : 1 }}
              onClick={() => onExportImage(imgW, imgH, { background: bg, mimeType: mime, quality: quality / 100, margin, filename })}
              disabled={isLoading || !isSceneLoaded}
              title={isSceneLoaded ? 'Export the drawing as an image' : 'Load a DXF file to enable export'}
            >
              Export Image
            </button>
            {imageUrl && (
              <div style={{ marginTop: 12, background: '#e9ecef', padding: 8, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: 4 }} />
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
